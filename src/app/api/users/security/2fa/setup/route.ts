import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import bcrypt from 'bcryptjs';
import { resolveAuthIdentity, loadUserRow } from '@/lib/currentUser';
import { generateTotpSecret, buildOtpauthUrl, generateBackupCodes } from '@/lib/totp';
import { readTwoFactorState, writeTwoFactorState } from '@/lib/twoFactorStore';

export const dynamic = 'force-dynamic';

const ISSUER = 'INVENTA.AI';

/**
 * POST /api/users/security/2fa/setup
 * Genera un secreto TOTP + QR + códigos de respaldo y lo guarda pendiente
 * (enabled=false) hasta que se confirme con un código válido.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId, email } = await resolveAuthIdentity();
    if ((!userId && !email) || !email) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();
    const row = await loadUserRow(supabase, userId, email);
    if (!row) {
      return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 });
    }

    const current = readTwoFactorState(row);
    if (current?.enabled) {
      return NextResponse.json({ error: 'El 2FA ya está habilitado.', code: 'ALREADY_ENABLED' }, { status: 409 });
    }

    const secret = generateTotpSecret();
    const otpauthUrl = buildOtpauthUrl(ISSUER, row.email || email, secret);
    const qrDataUrl = await QRCode.toDataURL(otpauthUrl);
    const backupCodes = generateBackupCodes(8);
    const hashedCodes = await Promise.all(backupCodes.map((c) => bcrypt.hash(c, 10)));

    try {
      const storage = await writeTwoFactorState(supabase, row.id, (row as any).image, {
        enabled: false,
        secret,
        codes: hashedCodes,
        enabledAt: null,
      });
      return NextResponse.json({
        success: true,
        secret,
        otpauthUrl,
        qrDataUrl,
        backupCodes,
        storage,
      });
    } catch (err: any) {
      console.error('Error al iniciar 2FA:', err);
      return NextResponse.json({ error: 'No se pudo iniciar la configuración 2FA.' }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Error en POST 2fa/setup:', error);
    return NextResponse.json({ error: 'Error interno. Intenta nuevamente.' }, { status: 500 });
  }
}
