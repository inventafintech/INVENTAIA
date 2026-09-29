import { NextRequest, NextResponse } from 'next/server';
import { resolveAuthIdentity, loadUserRow } from '@/lib/currentUser';
import { verifyTotpToken } from '@/lib/totp';
import { readTwoFactorState, writeTwoFactorState } from '@/lib/twoFactorStore';

export const dynamic = 'force-dynamic';

/**
 * POST /api/users/security/2fa/disable
 * Deshabilita el 2FA exigiendo un código TOTP vigente como confirmación.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId, email } = await resolveAuthIdentity();
    if (!userId && !email) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const token = typeof body?.token === 'string' ? body.token.trim() : '';
    if (!/^\d{6}$/.test(token)) {
      return NextResponse.json({ error: 'Ingresa el código actual de 6 dígitos para confirmar.' }, { status: 400 });
    }

    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();
    const row = await loadUserRow(supabase, userId, email);

    const state = readTwoFactorState(row);
    if (!state?.enabled || !state?.secret) {
      return NextResponse.json({ error: 'El 2FA no está habilitado.' }, { status: 400 });
    }

    if (!verifyTotpToken(state.secret, token)) {
      return NextResponse.json({ error: 'Código incorrecto o expirado.' }, { status: 401 });
    }

    try {
      await writeTwoFactorState(supabase, row.id, (row as any).image, null);
    } catch (err: any) {
      console.error('Error al deshabilitar 2FA:', err);
      return NextResponse.json({ error: 'No se pudo deshabilitar el 2FA.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Verificación en dos pasos deshabilitada.' });
  } catch (error: any) {
    console.error('Error en POST 2fa/disable:', error);
    return NextResponse.json({ error: 'Error interno. Intenta nuevamente.' }, { status: 500 });
  }
}
