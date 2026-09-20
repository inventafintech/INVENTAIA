import { cookies } from 'next/headers';
import crypto from 'crypto';

export interface SessionData {
  userId: string;
  email: string;
  name: string;
  avatarUrl?: string;
  googleId?: string;
  workspaceId?: string | null;
  workspaceSlug?: string | null;
  workspaceName?: string | null;
  workspaceRuc?: string | null;
  settings?: {
    ruc?: string;
    leadTime?: number;
    sla?: string;
    currency?: string;
    horizon?: string;
    notifyWhatsApp?: boolean;
    notifyEmail?: boolean;
  } | null;
  role?: 'OWNER' | 'ADMIN' | 'MEMBER' | null;
  createdAt: number;
}

export const SESSION_COOKIE_NAME = 'inventa_session';
const SESSION_SECRET =
  process.env.JWT_SECRET ||
  process.env.SESSION_SECRET ||
  'inventa-b2b-enterprise-session-secret-token-key-2026';

function signData(payload: string): string {
  const hmac = crypto.createHmac('sha256', SESSION_SECRET);
  hmac.update(payload);
  return `${payload}.${hmac.digest('hex')}`;
}

function verifyData(signedValue: string): string | null {
  try {
    const lastDot = signedValue.lastIndexOf('.');
    if (lastDot === -1) return null;
    const payload = signedValue.substring(0, lastDot);
    const signature = signedValue.substring(lastDot + 1);
    const hmac = crypto.createHmac('sha256', SESSION_SECRET);
    hmac.update(payload);
    const expected = hmac.digest('hex');
    if (signature.length === expected.length && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      return payload;
    }
    return null;
  } catch {
    return null;
  }
}

export class SessionManager {
  /**
   * Crea y establece la cookie de sesión HTTP-only firmada
   */
  public static async createSession(data: Omit<SessionData, 'createdAt'>): Promise<SessionData> {
    const sessionData: SessionData = {
      ...data,
      createdAt: Date.now(),
    };

    const serialized = Buffer.from(JSON.stringify(sessionData)).toString('base64');
    const signed = signData(serialized);

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, signed, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 14, // 14 días
    });

    return sessionData;
  }

  /**
   * Obtiene y valida la sesión actual desde las cookies
   */
  public static async getSession(): Promise<SessionData | null> {
    try {
      const cookieStore = await cookies();
      const cookie = cookieStore.get(SESSION_COOKIE_NAME);
      if (!cookie || !cookie.value) return null;

      const verified = verifyData(cookie.value);
      if (!verified) return null;

      const jsonStr = Buffer.from(verified, 'base64').toString('utf-8');
      const session = JSON.parse(jsonStr) as SessionData;

      // Caducidad de 14 días
      if (Date.now() - session.createdAt > 14 * 24 * 60 * 60 * 1000) {
        await this.destroySession();
        return null;
      }

      return session;
    } catch (err) {
      console.error('Error al recuperar sesión:', err);
      return null;
    }
  }

  /**
   * Actualiza el espacio de trabajo activo dentro de la sesión existente
   */
  public static async updateSessionWorkspace(
    workspaceId: string,
    workspaceSlug: string,
    workspaceName: string,
    role: 'OWNER' | 'ADMIN' | 'MEMBER' = 'OWNER'
  ): Promise<SessionData | null> {
    const current = await this.getSession();
    if (!current) return null;

    return this.createSession({
      ...current,
      workspaceId,
      workspaceSlug,
      workspaceName,
      role,
    });
  }

  /**
   * Destruye la sesión actual
   */
  public static async destroySession(): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
  }
}
