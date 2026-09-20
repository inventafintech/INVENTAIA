import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json(
      { error: 'Falta el parámetro "code" para completar la autorización con Mercado Libre' },
      { status: 400 }
    );
  }

  const appId = process.env.MERCADOLIBRE_APP_ID;
  const clientSecret = process.env.MERCADOLIBRE_CLIENT_SECRET;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'https://inventa-ai-nine.vercel.app'}/api/integraciones/mercadolibre/callback`;

  if (!appId || !clientSecret) {
    db.addLog(
      'MERCADOLIBRE',
      'ERROR',
      'OAUTH_EXCHANGE_FAILED',
      'Variables MERCADOLIBRE_APP_ID o MERCADOLIBRE_CLIENT_SECRET no configuradas.'
    );
    return NextResponse.json(
      { error: 'Servidor no configurado con credenciales de Mercado Libre' },
      { status: 500 }
    );
  }

  try {
    const response = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: appId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.access_token) {
      db.addLog(
        'MERCADOLIBRE',
        'ERROR',
        'OAUTH_EXCHANGE_FAILED',
        `Error intercambiando código con Mercado Libre: ${JSON.stringify(data)}`
      );
      return NextResponse.json(
        { error: 'Error al obtener token de Mercado Libre', details: data },
        { status: 400 }
      );
    }

    db.saveOAuthToken('mercadolibre', {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
      scope: data.scope,
    });

    db.saveIntegration('mercadolibre', { user_id: data.user_id }, 'configured');

    db.addLog(
      'MERCADOLIBRE',
      'SUCCESS',
      'OAUTH_TOKEN_ACQUIRED',
      `Cuenta Mercado Libre (User ID: ${data.user_id}) conectada con éxito.`
    );

    return NextResponse.redirect(new URL('/dashboard/integraciones?success=meli_connected', req.url));
  } catch (err: any) {
    db.addLog('MERCADOLIBRE', 'ERROR', 'OAUTH_EXCEPTION', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
