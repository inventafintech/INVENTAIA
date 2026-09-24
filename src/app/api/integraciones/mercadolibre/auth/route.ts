import { NextRequest, NextResponse } from 'next/server';
import { MercadoLibreService } from '@/services/MercadoLibreService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const host = req.headers.get('host') || 'inventa-ai.vercel.app';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const redirectUri = `${protocol}://${host}/api/integraciones/mercadolibre/callback`;

  // Sin credenciales de app no hay OAuth posible: volver a conectores
  // donde el estado Pendiente de configuración es visible.
  if (!process.env.MELI_APP_ID) {
    return NextResponse.redirect(new URL('/dashboard/integraciones', req.url));
  }

  const authUrl = MercadoLibreService.getAuthUrl(redirectUri);
  return NextResponse.redirect(authUrl);
}
