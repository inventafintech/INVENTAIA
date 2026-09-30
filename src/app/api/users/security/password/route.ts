import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { resolveAuthIdentity, loadUserRow, isMissingColumnError } from '@/lib/currentUser';
import { rateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

const BCRYPT_ROUNDS = 10;

function passwordPolicyError(password: string): string | null {
  if (password.length < 8) return 'La nueva contraseña debe tener al menos 8 caracteres.';
  if (password.length > 128) return 'La nueva contraseña no puede superar 128 caracteres.';
  if (!/[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(password) || !/[0-9]/.test(password)) {
    return 'La nueva contraseña debe incluir letras y números.';
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const limited = rateLimit(req, { limit: 30, windowMs: 60_000, keyPrefix: 'pwd' });
    if (limited) return limited;
    const { userId, email } = await resolveAuthIdentity();
    if (!userId && !email) {
      return NextResponse.json({ error: 'No autenticado. Inicia sesión nuevamente.' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : '';
    const currentPassword = typeof body?.currentPassword === 'string' ? body.currentPassword : '';

    const policyError = passwordPolicyError(newPassword);
    if (policyError) {
      return NextResponse.json({ error: policyError }, { status: 400 });
    }

    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();
    const row = await loadUserRow(supabase, userId, email);

    if (!row) {
      return NextResponse.json({ error: 'Usuario no encontrado en la base de datos.' }, { status: 404 });
    }

    const hasPassword = Boolean(row.password_hash);
    const isGoogleSso = Boolean(row.google_id);

    if (hasPassword) {
      if (!currentPassword) {
        return NextResponse.json({ error: 'Ingresa tu contraseña actual.' }, { status: 400 });
      }
      const matches = await bcrypt.compare(currentPassword, row.password_hash);
      if (!matches) {
        return NextResponse.json({ error: 'La contraseña actual no es correcta.' }, { status: 401 });
      }
      if (await bcrypt.compare(newPassword, row.password_hash)) {
        return NextResponse.json(
          { error: 'La nueva contraseña debe ser diferente a la actual.' },
          { status: 400 }
        );
      }
    } else if (isGoogleSso) {
      // Las cuentas Google SSO no tienen contraseña local: se gestiona en Google
      return NextResponse.json(
        {
          error: 'Tu cuenta usa Google SSO: la contraseña se gestiona en tu cuenta de Google.',
          code: 'GOOGLE_SSO_MANAGED',
        },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    const { error } = await supabase
      .from('users')
      .update({ password_hash: passwordHash, updated_at: new Date().toISOString() })
      .eq('id', row.id);

    if (error) {
      if (isMissingColumnError(error)) {
        return NextResponse.json(
          {
            error:
              'Falta la columna password_hash en Supabase. Ejecuta la migración SQL de seguridad (ver src/db/schema.sql).',
            code: 'MISSING_MIGRATION',
          },
          { status: 409 }
        );
      }
      console.error('Error al actualizar contraseña:', error);
      return NextResponse.json({ error: 'No se pudo actualizar la contraseña.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      mode: hasPassword ? 'changed' : 'created',
      message: hasPassword
        ? 'Contraseña actualizada correctamente.'
        : 'Contraseña configurada correctamente.',
    });
  } catch (error: any) {
    console.error('Error en POST /api/users/security/password:', error);
    return NextResponse.json({ error: 'Error interno. Intenta nuevamente.' }, { status: 500 });
  }
}
