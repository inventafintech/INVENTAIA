import { NextRequest, NextResponse } from 'next/server';
import { resolveAuthIdentity, loadUserRow } from '@/lib/currentUser';
import { verifyTotpToken } from '@/lib/totp';
import { readTwoFactorState, writeTwoFactorState } from '@/lib/twoFactorStore';

export const dynamic = 'force-dynamic';

/**
 * POST /api/users/security/2fa/verify-setup
 * Confirma el secreto pendiente con un código del autenticador y habilita el 2FA.
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
      return NextResponse.json({ error: 'Ingresa el código de 6 dígitos.' }, { status: 400 });
    }

    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();
    const row = await loadUserRow(supabase, userId, email);
    const state = readTwoFactorState(row);
    if (!state?.secret) {
      return NextResponse.json(
        { error: 'No hay configuración 2FA pendiente. Inicia el proceso nuevamente.' },
        { status: 400 }
      );
    }

    if (!verifyTotpToken(state.secret, token)) {
      return NextResponse.json({ error: 'Código incorrecto o expirado. Intenta con el código actual.' }, { status: 401 });
    }

    try {
      await writeTwoFactorState(supabase, row.id, (row as any).image, {
        ...state,
        enabled: true,
        enabledAt: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Error al habilitar 2FA:', err);
      return NextResponse.json({ error: 'No se pudo habilitar el 2FA.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Verificación en dos pasos habilitada.' });
  } catch (error: any) {
    console.error('Error en POST 2fa/verify-setup:', error);
    return NextResponse.json({ error: 'Error interno. Intenta nuevamente.' }, { status: 500 });
  }
}
