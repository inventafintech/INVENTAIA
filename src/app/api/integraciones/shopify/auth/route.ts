import { NextRequest, NextResponse } from 'next/server';
import { ShopifyService } from '@/services/ShopifyService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const shop = req.nextUrl.searchParams.get('shop');
  if (!shop) {
    return NextResponse.json({ success: false, error: 'Parámetro ?shop es requerido.' }, { status: 400 });
  }

  const host = req.headers.get('host') || 'inventa-ai.vercel.app';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const redirectUri = `${protocol}://${host}/api/integraciones/shopify/callback`;

  const authUrl = ShopifyService.getAuthUrl(shop, redirectUri);
  return NextResponse.redirect(authUrl);
}
