import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SessionManager } from '@/lib/session';

export interface AuthIdentity {
  userId?: string;
  email?: string;
}

/** Identidad del solicitante desde cookie firmada o sesión NextAuth. */
export async function resolveAuthIdentity(): Promise<AuthIdentity> {
  const session = await SessionManager.getSession();
  if (session?.userId || session?.email) {
    return { userId: session.userId, email: session.email };
  }
  const nextAuthSession = await getServerSession(authOptions);
  return {
    userId: (nextAuthSession?.user as any)?.id,
    email: nextAuthSession?.user?.email || undefined,
  };
}

function isMissingColumnError(error: any): boolean {
  if (!error) return false;
  if (error.code === 'PGRST204') return true;
  return /schema cache|Could not find/i.test(String(error.message || ''));
}

export { isMissingColumnError };

/** Fila del usuario en Supabase buscada por id y, como respaldo, por email. */
export async function loadUserRow(
  supabase: any,
  userId?: string,
  email?: string
): Promise<any | null> {
  if (userId) {
    const { data } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
    if (data) return data;
  }
  if (email) {
    const { data } = await supabase.from('users').select('*').eq('email', email).maybeSingle();
    if (data) return data;
  }
  return null;
}

/** Parser mínimo de User-Agent para la tarjeta de sesión activa. */
export function parseDevice(userAgent: string | null): string {
  const ua = userAgent || '';
  let os = 'Dispositivo desconocido';
  if (/Windows NT/i.test(ua)) os = 'Windows PC';
  else if (/Macintosh|Mac OS X/i.test(ua)) os = 'Mac';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iOS/i.test(ua)) os = 'iPhone / iPad';
  else if (/Linux/i.test(ua)) os = 'Linux';
  let browser = 'Navegador';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/Chrome\//i.test(ua)) browser = 'Chrome';
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = 'Safari';
  else if (/Firefox\//i.test(ua)) browser = 'Firefox';
  return `${os} · ${browser}`;
}
