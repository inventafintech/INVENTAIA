import { NextRequest, NextResponse } from 'next/server';
import { mergePreferences, LANGUAGES, CURRENCIES, COUNTRIES, NUMBER_FORMATS, DATE_FORMATS, SECTORS, PRODUCT_FIELDS } from '@/lib/preferences';

import { requireWorkspace } from '@/lib/requireWorkspace';
export const dynamic = 'force-dynamic';

async function resolveWorkspaceId(supabase: any): Promise<string | null> {
  try {
    const { SessionManager } = await import('@/lib/session');
    const session = await SessionManager.getSession().catch(() => null);
    if (session?.workspaceId && session.workspaceId !== 'ws-default') {
      const { data } = await supabase.from('workspaces').select('id').eq('id', session.workspaceId).maybeSingle();
      if (data?.id) return data.id;
    }
  } catch {
    // continuar con el primero disponible
  }
  const { data: first } = await supabase.from('workspaces').select('id').limit(1).maybeSingle();
  return first?.id || null;
}

/**
 * GET /api/workspace/preferences — preferencias fusionadas con defaults + updatedAt.
 */
export async function GET() {
  try {
    const auth = await requireWorkspace();
    if (auth.error) return auth.error;
    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();
    const workspaceId = await resolveWorkspaceId(supabase);
    if (!workspaceId) {
      return NextResponse.json({ error: 'Sin workspace disponible.' }, { status: 404 });
    }
    const { data: ws } = await supabase
      .from('workspaces')
      .select('settings,updated_at')
      .eq('id', workspaceId)
      .maybeSingle();
    return NextResponse.json({
      success: true,
      preferences: mergePreferences((ws?.settings as any)?.preferences),
      updatedAt: (ws as any)?.updated_at || null,
    });
  } catch (error: any) {
    console.error('Error en GET preferences:', error);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}

/**
 * PUT /api/workspace/preferences — merge parcial validado en settings.preferences.
 */
export async function PUT(req: NextRequest) {
  try {
    const auth = await requireWorkspace();
    if (auth.error) return auth.error;
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 });
    }

    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();
    const workspaceId = await resolveWorkspaceId(supabase);
    if (!workspaceId) {
      return NextResponse.json({ error: 'Sin workspace disponible.' }, { status: 404 });
    }

    const { data: ws } = await supabase.from('workspaces').select('settings').eq('id', workspaceId).maybeSingle();
    const current = mergePreferences((ws?.settings as any)?.preferences);
    const next = JSON.parse(JSON.stringify(current));

    if (body.locale && typeof body.locale === 'object') {
      const { language, currency, country, numberFormat, dateFormat } = body.locale;
      if (language !== undefined) {
        if (!LANGUAGES.some((l) => l.value === language)) {
          return NextResponse.json({ error: 'Idioma inválido.' }, { status: 400 });
        }
        next.locale.language = language;
      }
      if (currency !== undefined) {
        if (!CURRENCIES.some((c) => c.value === currency)) {
          return NextResponse.json({ error: 'Moneda inválida.' }, { status: 400 });
        }
        next.locale.currency = currency;
      }
      if (country !== undefined) {
        if (!COUNTRIES.some((c) => c.value === country)) {
          return NextResponse.json({ error: 'País inválido.' }, { status: 400 });
        }
        next.locale.country = country;
      }
      if (numberFormat !== undefined) {
        if (!NUMBER_FORMATS.some((f) => f.value === numberFormat)) {
          return NextResponse.json({ error: 'Formato de número inválido.' }, { status: 400 });
        }
        next.locale.numberFormat = numberFormat;
      }
      if (dateFormat !== undefined) {
        if (!DATE_FORMATS.some((f) => f.value === dateFormat)) {
          return NextResponse.json({ error: 'Formato de fecha inválido.' }, { status: 400 });
        }
        next.locale.dateFormat = dateFormat;
      }
    }

    if (body.lowStockThreshold !== undefined) {
      const v = Math.floor(Number(body.lowStockThreshold));
      if (!Number.isInteger(v) || v < 0 || v > 1000000) {
        return NextResponse.json({ error: 'Umbral inválido (0–1000000).' }, { status: 400 });
      }
      next.lowStockThreshold = v;
    }

    if (body.sector !== undefined) {
      if (body.sector !== null && !SECTORS.some((s) => s.id === body.sector)) {
        return NextResponse.json({ error: 'Sector inválido.' }, { status: 400 });
      }
      next.sector = body.sector;
    }

    if (body.productFields && typeof body.productFields === 'object') {
      for (const f of PRODUCT_FIELDS) {
        if (body.productFields[f.id] !== undefined) {
          next.productFields[f.id] = Boolean(body.productFields[f.id]);
        }
      }
    }

    if (body.tracking && typeof body.tracking === 'object') {
      if (body.tracking.lote !== undefined) next.tracking.lote = Boolean(body.tracking.lote);
      if (body.tracking.caducidad !== undefined) next.tracking.caducidad = Boolean(body.tracking.caducidad);
    }

    if (body.customUnits !== undefined) {
      if (!Array.isArray(body.customUnits)) {
        return NextResponse.json({ error: 'Unidades inválidas.' }, { status: 400 });
      }
      if (body.customUnits.length > 100) {
        return NextResponse.json({ error: 'Máximo 100 unidades personalizadas.' }, { status: 400 });
      }
      const cleaned = [];
      const seen = new Set<string>();
      for (const u of body.customUnits) {
        const name = typeof u?.name === 'string' ? u.name.trim().slice(0, 60) : '';
        const symbol = typeof u?.symbol === 'string' ? u.symbol.trim().slice(0, 12) : '';
        if (!name || !symbol || seen.has(symbol.toLowerCase())) continue;
        seen.add(symbol.toLowerCase());
        cleaned.push({
          id: typeof u?.id === 'string' && u.id ? u.id : `cu-${Date.now().toString(36)}-${cleaned.length}`,
          name,
          symbol,
        });
      }
      next.customUnits = cleaned;
    }

    const settings = { ...((ws?.settings as any) || {}), preferences: next };
    const { error } = await supabase.from('workspaces').update({ settings }).eq('id', workspaceId);
    if (error) {
      return NextResponse.json({ error: 'No se pudo guardar.' }, { status: 500 });
    }
    return NextResponse.json({ success: true, preferences: next });
  } catch (error: any) {
    console.error('Error en PUT preferences:', error);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}
