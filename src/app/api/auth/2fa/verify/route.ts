import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SessionManager } from '@/lib/session';
import { verifyTotpToken } from '@/lib/totp';
import { readTwoFactorState, writeTwoFactorState } from '@/lib/twoFactorStore';
import { rateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

function safeRedirect(path: unknown): string {
  if (typeof path === 'string' && path.startsWith('/') && !path.startsWith('//')) return path;
  return '/panel/resumen';
}

/**
 * POST /api/auth/2fa/verify
 * Verifica el segundo factor durante el login. Dos flujos:
 *  - Cookie firmada inventa_2fa_pending (demo / Google custom): crea la sesión completa.
 *  - Sesión NextAuth existente: valida el código y el cliente confirma con update().
 * Acepta código TOTP o código de respaldo (un solo uso).
 */
export async function POST(req: NextRequest) {
  try {
    // TOTP de 6 dígitos: frenar fuerza bruta por IP.
    const limited = await rateLimit(req, { limit: 10, windowMs: 60_000, keyPrefix: '2fa' });
    if (limited) return limited;
    const body = await req.json().catch(() => null);
    const token = typeof body?.token === 'string' ? body.token.trim() : '';
    const backupCode = typeof body?.backupCode === 'string' ? body.backupCode.trim().toUpperCase() : '';
    const redirect = safeRedirect(body?.callbackUrl);

    if (!/^\d{6}$/.test(token) && !backupCode) {
      return NextResponse.json({ error: 'Ingresa el código de 6 dígitos o un código de respaldo.' }, { status: 400 });
    }

    const pending = await SessionManager.getPendingTwoFactor();
    const nextAuthSession = await getServerSession(authOptions);

    const userId = pending?.userId || (nextAuthSession?.user as any)?.id;
    const email = pending?.email || nextAuthSession?.user?.email;

    if (!userId && !email) {
      return NextResponse.json({ error: 'Sesión de verificación expirada. Inicia sesión nuevamente.' }, { status: 401 });
    }

    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();

    let row: any = null;
    if (userId) {
      const { data } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
      row = data || null;
    }
    if (!row && email) {
      const { data } = await supabase.from('users').select('*').eq('email', email).maybeSingle();
      row = data || null;
    }

    const state = readTwoFactorState(row);
    if (!state?.enabled || !state?.secret) {
      return NextResponse.json({ error: 'El 2FA no está habilitado para esta cuenta.' }, { status: 400 });
    }

    let verified = false;
    let usedBackupIndex = -1;

    if (/^\d{6}$/.test(token)) {
      verified = verifyTotpToken(state.secret, token);
    } else if (backupCode) {
      const codes: string[] = state.codes;
      for (let i = 0; i < codes.length; i++) {
        try {
          if (await bcrypt.compare(backupCode, codes[i])) {
            verified = true;
            usedBackupIndex = i;
            break;
          }
        } catch {
          // continuar con el siguiente código
        }
      }
      if (verified && usedBackupIndex >= 0) {
        const remaining = codes.filter((_, i) => i !== usedBackupIndex);
        try {
          await writeTwoFactorState(supabase, row.id, (row as any).image, { ...state, codes: remaining });
        } catch {
          // el acceso ya fue validado; no bloquear por el conteo de códigos
        }
      }
    }

    if (!verified) {
      return NextResponse.json({ error: 'Código incorrecto o expirado. Intenta nuevamente.' }, { status: 401 });
    }

    // Flujo cookie (demo / Google custom): crear sesión completa ahora
    if (pending) {
      let workspace: any = null;
      if (row.workspace_id) {
        const { data } = await supabase.from('workspaces').select('*').eq('id', row.workspace_id).maybeSingle();
        workspace = data || null;
      }
      await SessionManager.clearPendingTwoFactor();
      await SessionManager.createSession({
        userId: row.id,
        email: row.email,
        name: row.name,
        avatarUrl: row.avatar_url && !String(row.avatar_url).startsWith('data:') ? row.avatar_url : undefined,
        googleId: row.google_id || undefined,
        workspaceId: workspace?.id || row.workspace_id || 'ws-default',
        workspaceSlug: workspace?.slug_url || null,
        workspaceName: workspace?.name || null,
        workspaceRuc: workspace?.ruc || null,
        role: 'OWNER',
      });
      return NextResponse.json({ success: true, redirect });
    }

    // Flujo NextAuth: el cliente confirma con update({ twoFactorVerified: true })
    return NextResponse.json({ success: true, nextauth: true, redirect });
  } catch (error: any) {
    console.error('Error en POST /api/auth/2fa/verify:', error);
    return NextResponse.json({ error: 'Error interno. Intenta nuevamente.' }, { status: 500 });
  }
}
