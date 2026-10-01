import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SessionManager } from '@/lib/session';

import { requireWorkspace } from '@/lib/requireWorkspace';
export const dynamic = 'force-dynamic';

const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2 MB
const AVATAR_RE = /^data:image\/(jpeg|jpg|png|webp);base64,/i;
const ALLOWED_LANGUAGES = ['es', 'en', 'pt'];
const MAX_NAME = 120;
const MAX_PHONE = 40;
const MAX_POSITION = 120;
const MAX_TIMEZONE = 60;

function asText(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const clean = value.trim();
  if (!clean) return '';
  return clean.slice(0, max);
}

function isMissingColumnError(error: any): boolean {
  if (!error) return false;
  if (error.code === 'PGRST204') return true;
  const msg = String(error.message || '');
  return /schema cache|Could not find/i.test(msg);
}

function avatarBytes(dataUrl: string): number {
  const b64 = dataUrl.split(',')[1] || '';
  return Math.floor(b64.length * 0.75);
}

/**
 * PUT /api/users/profile
 * Actualiza el perfil del usuario autenticado en Supabase (tabla users),
 * refresca la cookie de sesión firmada y devuelve el usuario actualizado.
 * Campos phone/position/language/timezone requieren la migración:
 *   ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
 *   ALTER TABLE users ADD COLUMN IF NOT EXISTS position TEXT;
 *   ALTER TABLE users ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'es';
 *   ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Lima';
 * Si esas columnas aún no existen, name/avatar se guardan igual y la
 * respuesta incluye pendingMigration con el detalle (sin mocks).
 */
export async function PUT(req: NextRequest) {
  try {
    const auth = await requireWorkspace();
    if (auth.error) return auth.error;
    const session = await SessionManager.getSession();
    const nextAuthSession = await getServerSession(authOptions);

    const userId = session?.userId || (nextAuthSession?.user as any)?.id;
    const sessionEmail = session?.email || nextAuthSession?.user?.email;

    if (!userId && !sessionEmail) {
      return NextResponse.json({ error: 'No autenticado. Inicia sesión nuevamente.' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 });
    }

    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) {
      return NextResponse.json({ error: 'El nombre es obligatorio.' }, { status: 400 });
    }
    if (name.length > MAX_NAME) {
      return NextResponse.json({ error: `El nombre no puede superar ${MAX_NAME} caracteres.` }, { status: 400 });
    }

    const phone = asText(body.phone, MAX_PHONE);
    const position = asText(body.position, MAX_POSITION);
    const timezone = asText(body.timezone, MAX_TIMEZONE);
    const language =
      typeof body.language === 'string' && ALLOWED_LANGUAGES.includes(body.language)
        ? body.language
        : undefined;

    let avatarUrl: string | undefined;
    if (body.avatar !== undefined && body.avatar !== null && body.avatar !== '') {
      if (typeof body.avatar !== 'string' || !AVATAR_RE.test(body.avatar)) {
        return NextResponse.json(
          { error: 'Formato de avatar no válido. Usa JPG, PNG o WebP.' },
          { status: 400 }
        );
      }
      if (avatarBytes(body.avatar) > MAX_AVATAR_BYTES) {
        return NextResponse.json({ error: 'El avatar supera el máximo de 2 MB.' }, { status: 400 });
      }
      avatarUrl = body.avatar;
    }

    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();

    // Localizar fila existente por id y, como respaldo, por email
    let row: any = null;
    if (userId) {
      const { data } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
      row = data || null;
    }
    if (!row && sessionEmail) {
      const { data } = await supabase.from('users').select('*').eq('email', sessionEmail).maybeSingle();
      row = data || null;
    }

    const coreUpdate: Record<string, unknown> = {
      name,
      updated_at: new Date().toISOString(),
    };
    if (avatarUrl) coreUpdate.avatar_url = avatarUrl;

    const extraUpdate: Record<string, unknown> = {};
    if (phone !== undefined) extraUpdate.phone = phone;
    if (position !== undefined) extraUpdate.position = position;
    if (language !== undefined) extraUpdate.language = language;
    if (timezone !== undefined) extraUpdate.timezone = timezone;

    let targetId = row?.id as string | undefined;

    if (!targetId) {
      // El usuario autenticado aún no existe en la BD: crearlo (upsert por email)
      if (!sessionEmail) {
        return NextResponse.json({ error: 'No se pudo identificar el correo del usuario.' }, { status: 400 });
      }
      const { data: inserted, error: insertError } = await supabase
        .from('users')
        .insert({ id: userId || `usr-${Date.now()}`, email: sessionEmail, ...coreUpdate })
        .select()
        .single();
      if (insertError || !inserted) {
        console.error('Error al crear usuario:', insertError);
        return NextResponse.json({ error: 'No se pudo guardar el perfil en la base de datos.' }, { status: 500 });
      }
      targetId = inserted.id;
      row = inserted;
    }

    // Intentar actualización completa; si faltan columnas nuevas, reintentar solo con campos base
    let pendingMigration: string[] = [];
    let saved: any = row;

    const fullPayload = { ...coreUpdate, ...extraUpdate };
    const hasExtras = Object.keys(extraUpdate).length > 0;

    const first = await supabase.from('users').update(fullPayload).eq('id', targetId).select().single();
    if (first.error) {
      if (hasExtras && isMissingColumnError(first.error)) {
        const retry = await supabase.from('users').update(coreUpdate).eq('id', targetId).select().single();
        if (retry.error || !retry.data) {
          console.error('Error al actualizar perfil:', retry.error);
          return NextResponse.json({ error: 'No se pudo guardar el perfil en la base de datos.' }, { status: 500 });
        }
        saved = retry.data;
        pendingMigration = Object.keys(extraUpdate);
      } else {
        console.error('Error al actualizar perfil:', first.error);
        return NextResponse.json({ error: 'No se pudo guardar el perfil en la base de datos.' }, { status: 500 });
      }
    } else {
      saved = first.data;
    }

    // Refrescar cookie de sesión firmada (nombre/email). El avatar data URL
    // nunca entra a la cookie por límite de tamaño: el header lo lee de la BD.
    if (session) {
      const keepAvatar =
        session.avatarUrl && !session.avatarUrl.startsWith('data:') ? session.avatarUrl : undefined;
      await SessionManager.createSession({
        userId: session.userId,
        email: sessionEmail || session.email,
        name,
        avatarUrl: keepAvatar,
        googleId: session.googleId,
        workspaceId: session.workspaceId,
        workspaceSlug: session.workspaceSlug,
        workspaceName: session.workspaceName,
        workspaceRuc: session.workspaceRuc,
        settings: session.settings ?? null,
        role: session.role ?? null,
      });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: saved.id,
        name: saved.name,
        email: saved.email,
        avatar_url: saved.avatar_url ?? null,
        phone: saved.phone ?? null,
        position: saved.position ?? null,
        language: saved.language ?? null,
        timezone: saved.timezone ?? null,
        provider: saved.google_id ? 'google' : 'credentials',
      },
      ...(pendingMigration.length > 0
        ? {
            pendingMigration,
            warning:
              'Nombre y avatar guardados. Para persistir teléfono, cargo, idioma y zona horaria ejecuta la migración SQL de columnas en Supabase (ver db/schema.sql).',
          }
        : {}),
    });
  } catch (error: any) {
    console.error('Error en PUT /api/users/profile:', error);
    return NextResponse.json(
      { error: 'Error interno al guardar el perfil. Intenta nuevamente.' },
      { status: 500 }
    );
  }
}
