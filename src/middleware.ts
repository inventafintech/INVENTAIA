import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Rutas que requieren autenticación obligatoria
  const isProtected =
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/inventario') ||
    pathname.startsWith('/entidades') ||
    pathname.startsWith('/configuracion') ||
    pathname.startsWith('/complementos') ||
    pathname.startsWith('/ayuda') ||
    pathname.startsWith('/panel') ||
    pathname.startsWith('/users') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/estrategia') ||
    pathname.startsWith('/finanzas') ||
    pathname.startsWith('/abastecimiento');

  if (!isProtected) {
    return NextResponse.next();
  }

  // 1. Verificar token de sesión de NextAuth.js
  const nextAuthToken = await getToken({
    req,
    secret:
      process.env.NEXTAUTH_SECRET ||
      process.env.JWT_SECRET ||
      'inventa-enterprise-nextauth-secret-key-2026',
  });

  // 2. Verificar cookie de sesión institucional (inventa_session)
  const inventaSessionCookie = req.cookies.get('inventa_session')?.value;
  let inventaWorkspaceId: string | null = null;
  if (inventaSessionCookie) {
    try {
      const parts = inventaSessionCookie.split('.');
      if (parts[0]) {
        const decoded = JSON.parse(Buffer.from(parts[0], 'base64').toString('utf-8'));
        inventaWorkspaceId = decoded.workspaceId || null;
      }
    } catch {}
  }

  const isAuthenticated = Boolean(nextAuthToken || inventaSessionCookie);

  if (!isAuthenticated) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  const workspaceId =
    (nextAuthToken as any)?.workspace_id ||
    (nextAuthToken as any)?.workspace?.id ||
    (nextAuthToken as any)?.hasWorkspace ||
    inventaWorkspaceId;

  // Si intenta entrar al dashboard pero aún no tiene workspace registrado, redirigir a onboarding
  if (pathname.startsWith('/dashboard') && !workspaceId) {
    return NextResponse.redirect(new URL('/onboarding', req.url));
  }

  // Si ya tiene workspace registrado e intenta entrar a onboarding, redirigir directo al dashboard
  if (pathname.startsWith('/onboarding') && workspaceId) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/onboarding',
    '/dashboard/:path*',
    '/inventario/:path*',
    '/entidades/:path*',
    '/configuracion/:path*',
    '/complementos/:path*',
    '/ayuda/:path*',
    '/panel/:path*',
    '/users/:path*',
    '/settings/:path*',
    '/estrategia/:path*',
    '/finanzas/:path*',
    '/abastecimiento/:path*',
  ],
};
