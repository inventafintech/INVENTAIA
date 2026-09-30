import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

/**
 * Verifica la firma HMAC-SHA256 de la cookie institucional en el edge
 * (WebCrypto, sin dependencias Node). Formato: base64(payload).hex(hmac).
 * Cierra el bypass por mera presencia de la cookie: un valor inventado
 * ya no abre el shell de páginas protegidas.
 */
async function verifyInventaCookie(raw: string): Promise<string | null> {
  try {
    const lastDot = raw.lastIndexOf('.');
    if (lastDot === -1) return null;
    const payload = raw.substring(0, lastDot);
    const signature = raw.substring(lastDot + 1);
    if (!/^[0-9a-f]{64}$/.test(signature)) return null;
    const secret =
      process.env.JWT_SECRET ||
      process.env.SESSION_SECRET ||
      'inventa-b2b-enterprise-session-secret-token-key-2026';
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    const sigBytes = new Uint8Array(signature.length / 2);
    for (let i = 0; i < sigBytes.length; i++) {
      sigBytes[i] = parseInt(signature.substring(i * 2, i * 2 + 2), 16);
    }
    const ok = await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes,
      new TextEncoder().encode(payload)
    );
    if (!ok) return null;
    const bin = atob(payload);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const decoded = JSON.parse(new TextDecoder().decode(bytes));
    return (decoded?.workspaceId as string) || null;
  } catch {
    return null;
  }
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // NOTA: /plans, /ayuda y /help son públicos a propósito — el landing los
  // enlaza (Precios, Recursos, Guías, Soporte) y deben funcionar sin sesión.
  // Rutas que requieren autenticación obligatoria
  const isProtected =
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/overview') ||
    pathname.startsWith('/stock-alerts') ||
    pathname.startsWith('/activity-log') ||
    pathname.startsWith('/products') ||
    pathname.startsWith('/inventario') ||
    pathname.startsWith('/inventory') ||
    pathname.startsWith('/entidades') ||
    pathname.startsWith('/configuracion') ||
    pathname.startsWith('/complementos') ||
    pathname.startsWith('/addons') ||
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

  // 2. Verificar la cookie de sesión institucional (firma HMAC obligatoria).
  const inventaSessionCookie = req.cookies.get('inventa_session')?.value;
  const inventaWorkspaceId = inventaSessionCookie
    ? await verifyInventaCookie(inventaSessionCookie)
    : null;

  const isAuthenticated = Boolean(nextAuthToken || inventaWorkspaceId);

  if (!isAuthenticated) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Enforcement de 2FA para sesiones NextAuth: si la cuenta lo exige y aún
  // no se verificó el TOTP en este login, forzar la pantalla de verificación.
  // (El flujo por cookie nunca crea sesión completa sin verificar antes.)
  if (
    nextAuthToken &&
    (nextAuthToken as any).twoFaEnabled === true &&
    (nextAuthToken as any).twoFactorVerified !== true &&
    !pathname.startsWith('/login/verify-2fa')
  ) {
    const verifyUrl = new URL('/login/verify-2fa', req.url);
    verifyUrl.searchParams.set('callbackUrl', req.nextUrl.pathname);
    verifyUrl.searchParams.set('flow', 'nextauth');
    return NextResponse.redirect(verifyUrl);
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

  // Anti-caché en rutas protegidas: tras el logout, el botón Atrás no debe
  // mostrar un dashboard cacheado (ni bfcache ni caché HTTP).
  const response = NextResponse.next();
  response.headers.set('Cache-Control', 'no-store, must-revalidate');
  response.headers.set('Pragma', 'no-cache');
  return response;
}

export const config = {
  matcher: [
    '/onboarding',
    '/dashboard/:path*',
    '/overview',
    '/stock-alerts',
    '/activity-log',
    '/products/:path*',
    '/inventario/:path*',
    '/inventory/:path*',
    '/entidades/:path*',
    '/configuracion/:path*',
    '/complementos/:path*',
    '/addons',
    '/panel/:path*',
    '/users/:path*',
    '/settings/:path*',
    '/estrategia/:path*',
    '/finanzas/:path*',
    '/abastecimiento/:path*',
  ],
};
