import { NextRequest, NextResponse } from 'next/server';
import { GoogleAuthService } from '@/services/GoogleAuthService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const origin = url.origin;
    const redirectUri = `${origin}/api/auth/google/callback`;

    // Sin credenciales GCP configuradas no hay OAuth posible: aviso honesto.
    if (!GoogleAuthService.isConfigured()) {
      return NextResponse.redirect(
        new URL('/login?notice=google_credentials_pending', req.url)
      );
    }

    // Flujo real de Google OAuth 2.0
    const state = `inv_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const authUrl = GoogleAuthService.getAuthorizationUrl(redirectUri, state);

    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    console.error('Error initiating Google OAuth:', error);
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message || 'Error de autenticación')}`, req.url)
    );
  }
}
