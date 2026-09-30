import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';

/**
 * robots dinámico: responde con el host real del deployment
 * (inventa-ia.vercel.app, inventa-fintech.vercel.app, previews...).
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = (await headers()).get('host') || 'inventa-ia.vercel.app';
  const base = `https://${host}`;
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/$', '/login$', '/plans$', '/addons$', '/ayuda/', '/help/'],
        disallow: [
          '/dashboard/',
          '/overview',
          '/panel/',
          '/inventory/',
          '/inventario/',
          '/entidades/',
          '/api/',
          '/users/',
          '/settings/',
          '/onboarding',
          '/chat',
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
