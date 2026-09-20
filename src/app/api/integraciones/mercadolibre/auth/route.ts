import { NextRequest, NextResponse } from 'next/server';
import { MercadoLibreService } from '@/services/MercadoLibreService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const host = req.headers.get('host') || 'inventa-ai.vercel.app';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const redirectUri = `${protocol}://${host}/api/integraciones/mercadolibre/callback`;

  const authUrl = MercadoLibreService.getAuthUrl(redirectUri);
  return NextResponse.redirect(authUrl);
}
