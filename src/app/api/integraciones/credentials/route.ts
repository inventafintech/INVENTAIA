import { NextRequest, NextResponse } from 'next/server';
import { SessionManager } from '@/lib/session';
import { IntegrationService } from '@/services/IntegrationService';

export const dynamic = 'force-dynamic';

const PROVIDERS: Record<string, { fields: string[]; labels: Record<string, string> }> = {
  whatsapp: {
    fields: ['access_token', 'phone_number_id'],
    labels: { access_token: 'Token de acceso (Meta System User)', phone_number_id: 'Phone Number ID' },
  },
  sap: {
    fields: ['baseUrl'],
    labels: { baseUrl: 'URL base OData (SAP_HOST)' },
  },
  woocommerce: {
    fields: ['storeUrl', 'consumerKey', 'consumerSecret'],
    labels: { storeUrl: 'URL de la tienda', consumerKey: 'Consumer Key', consumerSecret: 'Consumer Secret' },
  },
};

async function resolveWorkspaceId(supabase: any): Promise<string | null> {
  try {
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

async function liveVerify(
  provider: string,
  creds: Record<string, string>
): Promise<{ ok: boolean; detail: string }> {
  try {
    if (provider === 'whatsapp') {
      // GET al Phone Number ID: valida token + ID sin enviar mensajes
      const res = await fetch(`https://graph.facebook.com/v19.0/${creds.phone_number_id}?fields=id,display_phone_number`, {
        headers: { Authorization: `Bearer ${creds.access_token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return { ok: false, detail: (data as any)?.error?.message || `Meta API HTTP ${res.status}` };
      }
      return { ok: true, detail: 'Token y Phone ID verificados con Meta.' };
    }
    if (provider === 'sap') {
      const base = creds.baseUrl.replace(/\/+$/, '');
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      try {
        const res = await fetch(`${base}/sap/opu/odata/sap/API_PRODUCT_SRV`, { signal: controller.signal });
        // Cualquier respuesta HTTP (incluido 401) prueba alcance de red al host SAP
        return { ok: true, detail: `Host SAP alcanzable (HTTP ${res.status}).` };
      } finally {
        clearTimeout(timer);
      }
    }
    if (provider === 'woocommerce') {
      const base = creds.storeUrl.replace(/\/+$/, '');
      const auth = Buffer.from(`${creds.consumerKey}:${creds.consumerSecret}`).toString('base64');
      const res = await fetch(`${base}/wp-json/wc/v3/products?per_page=1`, {
        headers: { Authorization: `Basic ${auth}` },
      });
      if (res.status === 401 || res.status === 403) {
        return { ok: false, detail: 'WooCommerce rechazó las credenciales (401/403).' };
      }
      if (!res.ok) {
        return { ok: false, detail: `WooCommerce HTTP ${res.status}.` };
      }
      return { ok: true, detail: 'Credenciales WooCommerce verificadas contra la API.' };
    }
    return { ok: false, detail: 'Proveedor no soportado para credenciales manuales.' };
  } catch (err: any) {
    return { ok: false, detail: err?.name === 'AbortError' ? 'Timeout de conexión.' : err?.message || 'Error de red.' };
  }
}

/**
 * POST /api/integraciones/credentials { provider, credentials }
 * Guarda y VERIFICA en vivo las llaves manuales (WhatsApp/SAP/WooCommerce).
 * OAuth (shopify/mercadolibre/...) se rechaza: usan su flujo dedicado.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const provider = typeof body?.provider === 'string' ? body.provider : '';
    const credentials = body?.credentials && typeof body.credentials === 'object' ? body.credentials : {};

    const spec = PROVIDERS[provider];
    if (!spec) {
      return NextResponse.json(
        { error: 'Proveedor con OAuth dedicado o no soportado: usa su flujo de conexión.' },
        { status: 400 }
      );
    }
    for (const f of spec.fields) {
      if (typeof credentials[f] !== 'string' || !credentials[f].trim()) {
        return NextResponse.json({ error: `Falta el campo obligatorio: ${spec.labels[f] || f}.` }, { status: 400 });
      }
    }

    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();
    const workspaceId = await resolveWorkspaceId(supabase);
    if (!workspaceId) {
      return NextResponse.json({ error: 'Sin workspace disponible.' }, { status: 404 });
    }

    // Verificación viva ANTES de persistir (transaccional en espíritu: no se guarda lo inválido)
    const check = await liveVerify(provider, credentials);
    if (!check.ok) {
      await IntegrationService.logIntegrationEvent(
        workspaceId, 'sistema@inventa.ai', provider.toUpperCase(), 'ERROR', `Validación de credenciales fallida: ${check.detail}`
      );
      return NextResponse.json({ error: `Credenciales inválidas: ${check.detail}` }, { status: 422 });
    }

    const { data: ws } = await supabase.from('workspaces').select('settings').eq('id', workspaceId).maybeSingle();
    const settings = { ...((ws?.settings as any) || {}) };
    settings[`config_${provider}`] = { ...(settings[`config_${provider}`] || {}), ...credentials };
    const { error } = await supabase.from('workspaces').update({ settings }).eq('id', workspaceId);
    if (error) {
      return NextResponse.json({ error: 'No se pudo guardar.' }, { status: 500 });
    }

    await IntegrationService.logIntegrationEvent(
      workspaceId, 'sistema@inventa.ai', provider.toUpperCase(), 'EXITOSO', `Credenciales verificadas y guardadas. ${check.detail}`
    );
    await IntegrationService.saveProviderAuth(workspaceId, provider, {
      accessToken: 'manual',
      config: settings[`config_${provider}`],
    }).catch(() => {});

    return NextResponse.json({ success: true, message: `Conectado: ${check.detail}` });
  } catch (error: any) {
    console.error('Error en POST credentials:', error);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}
