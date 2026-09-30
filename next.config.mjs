/** @type {import('next').NextConfig} */
const securityHeaders = [
  // Clickjacking: solo la propia app puede embeberse (OAuth usa redirects, no iframes).
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Permisos: nada de cámara/mic/geolocalización para una app de inventario.
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  // HSTS: solo tiene efecto en HTTPS (Vercel). Sin preload para no bloquear iteración.
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  // CSP pragmática: Next necesita 'unsafe-inline' en scripts/estilos; se bloquean
  // object/plugins, se restringe framing y se limita la red a orígenes conocidos.
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://*.supabase.co",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://*.supabase.co https://*.groq.com https://*.googleapis.com https://accounts.google.com https://oauth2.googleapis.com",
      "frame-src 'self' https://accounts.google.com",
      "frame-ancestors 'self'",
      "object-src 'none'",
      "base-uri 'self'",
    ].join('; '),
  },
];

const nextConfig = {
  reactStrictMode: true,
  distDir: 'web',
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
