import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Rutas que requieren autenticación obligatoria
  const isProtected = pathname.startsWith('/onboarding') || pathname.startsWith('/dashboard');

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
  const inventaSession = req.cookies.get('inventa_session')?.value;

  const isAuthenticated = Boolean(nextAuthToken || inventaSession);

  if (!isAuthenticated) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/onboarding', '/dashboard/:path*'],
};
