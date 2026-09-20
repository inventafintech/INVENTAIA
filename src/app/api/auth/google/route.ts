import { NextRequest, NextResponse } from 'next/server';
import { GoogleAuthService } from '@/services/GoogleAuthService';
import { SessionManager } from '@/lib/session';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const origin = url.origin;
    const redirectUri = `${origin}/api/auth/google/callback`;
    const isDev = url.searchParams.get('dev') === 'true';

    // Modo Desarrollador / Demo para pruebas inmediatas si las credenciales de GCP aún no están inyectadas
    if (isDev || !GoogleAuthService.isConfigured()) {
      if (!GoogleAuthService.isConfigured() && !isDev) {
        // Redirigir a login con aviso descriptivo
        return NextResponse.redirect(
          new URL('/login?notice=google_credentials_pending', req.url)
        );
      }

      // Crear sesión con perfil de Google Workspace de prueba
      const demoEmail = url.searchParams.get('email') || 'jmgonzalez.contact@gmail.com';
      const demoName = url.searchParams.get('name') || 'José González';
      const demoAvatar =
        url.searchParams.get('avatar') ||
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';

      const user = db.upsertUser({
        name: demoName,
        email: demoEmail,
        avatar_url: demoAvatar,
        google_id: `goog-demo-${Date.now()}`,
      });

      const userWorkspaces = db.getUserWorkspaces(user.id);
      const activeWorkspace = userWorkspaces[0] || null;

      await SessionManager.createSession({
        userId: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatar_url,
        googleId: user.google_id,
        workspaceId: activeWorkspace?.id || null,
        workspaceSlug: activeWorkspace?.slug_url || null,
        workspaceName: activeWorkspace?.name || null,
        role: activeWorkspace?.role || null,
      });

      if (!activeWorkspace) {
        return NextResponse.redirect(new URL('/onboarding', req.url));
      }
      return NextResponse.redirect(new URL('/dashboard', req.url));
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
