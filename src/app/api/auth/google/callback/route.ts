import { NextRequest, NextResponse } from 'next/server';
import { GoogleAuthService } from '@/services/GoogleAuthService';
import { SessionManager } from '@/lib/session';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');

    if (error) {
      console.error('Google OAuth callback error:', error);
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(`Google denegó el acceso: ${error}`)}`, req.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/login?error=Código+de+autorización+no+proporcionado', req.url)
      );
    }

    const redirectUri = `${url.origin}/api/auth/google/callback`;

    // 1. Intercambiar código por tokens oficiales de Google
    const tokens = await GoogleAuthService.exchangeCodeForTokens(code, redirectUri);

    // 2. Obtener perfil del usuario autenticado
    const profile = await GoogleAuthService.getUserProfile(tokens.access_token);

    // 3. Upsert en tabla users
    const user = db.upsertUser({
      name: profile.name,
      email: profile.email,
      avatar_url: profile.picture,
      google_id: profile.id,
    });

    // 4. Verificar si el usuario ya tiene espacios de trabajo asignados
    const userWorkspaces = db.getUserWorkspaces(user.id);
    const activeWorkspace = userWorkspaces[0] || null;

    // 4b. Si la cuenta exige segundo factor, dejar la sesión pendiente.
    // Lee columnas o blob en `image` (automigración sin SQL previo).
    try {
      const { createClient } = await import('@/utils/supabase/server');
      const { readTwoFactorState } = await import('@/lib/twoFactorStore');
      const supabase = await createClient();
      const { data: secRow } = await supabase
        .from('users')
        .select('*')
        .eq('email', profile.email)
        .maybeSingle();
      if (readTwoFactorState(secRow)?.enabled) {
        await SessionManager.createPendingTwoFactor(secRow.id, profile.email);
        const verifyUrl = new URL('/login/verify-2fa', req.url);
        verifyUrl.searchParams.set('callbackUrl', activeWorkspace ? '/dashboard' : '/onboarding');
        verifyUrl.searchParams.set('flow', 'cookie');
        return NextResponse.redirect(verifyUrl);
      }
    } catch {
      // Ante cualquier fallo, continuar con el flujo normal
    }

    // 5. Crear sesión en cookie HTTP-only
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

    // 6. Enrutamiento condicional Multi-Tenant
    if (!activeWorkspace) {
      // Si el usuario no tiene espacio de trabajo, redirigir a Onboarding
      return NextResponse.redirect(new URL('/onboarding', req.url));
    }

    // Si ya cuenta con espacio, redirigir al Cerebro de Compras
    return NextResponse.redirect(new URL('/dashboard', req.url));
  } catch (err: any) {
    console.error('Error in Google OAuth callback:', err);
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(err.message || 'Error al procesar callback de Google')}`, req.url)
    );
  }
}
