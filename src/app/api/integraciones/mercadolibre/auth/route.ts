import { NextResponse } from 'next/server';

export async function GET() {
  const appId = process.env.MERCADOLIBRE_APP_ID || 'meli_app_id_placeholder';
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'https://inventa-ai-nine.vercel.app'}/api/integraciones/mercadolibre/callback`;

  // Official Mercado Libre OAuth URL
  const authUrl = `https://auth.mercadolibre.com.pe/authorization?response_type=code&client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}`;

  return NextResponse.redirect(authUrl);
}
