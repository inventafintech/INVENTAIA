import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';

/**
 * Sitemap dinámico: URLs con el host real del deployment.
 * Solo rutas públicas (el resto va en Disallow del robots).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const host = (await headers()).get('host') || 'inventa-ia.vercel.app';
  const base = `https://${host}`;
  const monthly: Array<{
    url: string;
    changeFrequency: 'monthly';
    priority: number;
  }> = [
    '/login',
    '/plans',
    '/addons',
    '/ayuda/guia',
    '/ayuda/faq',
    '/ayuda/aprender',
    '/ayuda/soporte',
    '/help/user-guide',
    '/help/faq',
    '/help/learn',
    '/help/contact-support',
  ].map((p) => ({ url: `${base}${p}`, changeFrequency: 'monthly', priority: 0.5 }));
  return [
    { url: base, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/plans`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/login`, changeFrequency: 'monthly', priority: 0.6 },
    ...monthly.filter((m) => m.url !== `${base}/plans` && m.url !== `${base}/login`),
  ];
}
