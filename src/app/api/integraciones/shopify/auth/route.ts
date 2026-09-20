import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const shop = searchParams.get('shop');

  if (!shop) {
    return NextResponse.json(
      { error: 'Debe especificar el parámetro "shop" (ej. mi-tienda.myshopify.com)' },
      { status: 400 }
    );
  }

  // Clean shop domain
  const cleanShop = shop.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const apiKey = process.env.SHOPIFY_API_KEY || 'shopify_client_id_placeholder';
  const scopes = 'read_products,read_orders,read_inventory,write_inventory';
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'https://inventa-ai-nine.vercel.app'}/api/integraciones/shopify/callback`;

  // Real Shopify OAuth authorization URL
  const authUrl = `https://${cleanShop}/admin/oauth/authorize?client_id=${apiKey}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}&state=inventa_oauth_state`;

  return NextResponse.redirect(authUrl);
}
