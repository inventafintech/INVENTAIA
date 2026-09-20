import { db } from '@/lib/db';

export interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  id_token?: string;
}

export interface GoogleUserProfile {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  locale?: string;
}

export class GoogleAuthService {
  private static readonly AUTH_BASE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
  private static readonly TOKEN_URL = 'https://oauth2.googleapis.com/token';
  private static readonly USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

  /**
   * Verifica si las credenciales de Google OAuth están configuradas en el entorno
   */
  public static isConfigured(): boolean {
    return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  }

  /**
   * Genera la URL oficial de Google OAuth 2.0
   */
  public static getAuthorizationUrl(redirectUri: string, state: string = 'inventa-auth'): string {
    const clientId = process.env.GOOGLE_CLIENT_ID;

    if (!clientId) {
      throw new Error(
        'GOOGLE_CLIENT_ID no está configurado en las variables de entorno. Configure las credenciales OAuth en Google Cloud Console.'
      );
    }

    const scopes = ['openid', 'profile', 'email'].join(' ');

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes,
      access_type: 'offline',
      prompt: 'consent',
      state,
    });

    return `${this.AUTH_BASE_URL}?${params.toString()}`;
  }

  /**
   * Intercambia el código de autorización por tokens de acceso y actualización de Google
   */
  public static async exchangeCodeForTokens(
    code: string,
    redirectUri: string
  ): Promise<GoogleTokens> {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('Credenciales de Google OAuth incompletas en variables de entorno.');
    }

    const response = await fetch(this.TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error en intercambio de token con Google (${response.status}): ${errorText}`);
    }

    const tokens = (await response.json()) as GoogleTokens;

    // Persistir tokens en oauth_tokens
    db.saveOAuthToken('google', {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      scope: tokens.scope,
    });

    db.addLog(
      'google',
      'SUCCESS',
      'GOOGLE_OAUTH_TOKEN_EXCHANGED',
      'EXITOSO',
      'Tokens OAuth 2.0 de Google obtenidos y almacenados correctamente.'
    );

    return tokens;
  }

  /**
   * Obtiene la información del perfil del usuario desde la API de Google
   */
  public static async getUserProfile(accessToken: string): Promise<GoogleUserProfile> {
    const response = await fetch(this.USERINFO_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error al obtener perfil de Google (${response.status}): ${errorText}`);
    }

    return (await response.json()) as GoogleUserProfile;
  }
}
