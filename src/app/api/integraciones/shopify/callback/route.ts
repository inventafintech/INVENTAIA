import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const shop = searchParams.get('shop');
  const code = searchParams.get('code');

  if (!shop || !code) {
    return NextResponse.json(
      { error: 'Faltan parámetros requeridos (shop o code) para completar OAuth con Shopify' },
      { status: 400 }
    );
  }

  const apiKey = process.env.SHOPIFY_API_KEY;
  const apiSecret = process.env.SHOPIFY_API_SECRET;

  if (!apiKey || !apiSecret) {
    db.addLog(
      'SHOPIFY',
      'ERROR',
      'OAUTH_EXCHANGE_FAILED',
      'Variables de entorno SHOPIFY_API_KEY o SHOPIFY_API_SECRET no configuradas en el servidor.'
    );
    return NextResponse.json(
      { error: 'Servidor no configurado con SHOPIFY_API_KEY / SHOPIFY_API_SECRET' },
      { status: 500 }
    );
  }

  try {
    // Real Token Exchange with Shopify API
    const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: apiKey,
        client_secret: apiSecret,
        code,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.access_token) {
      db.addLog(
        'SHOPIFY',
        'ERROR',
        'OAUTH_EXCHANGE_FAILED',
        `Error intercambiando código con Shopify: ${JSON.stringify(data)}`
      );
      return NextResponse.json(
        { error: 'Error al obtener token de acceso de Shopify', details: data },
        { status: 400 }
      );
    }

    // Persist real token in database
    db.saveOAuthToken('shopify', {
      shop_domain: shop,
      access_token: data.access_token,
      scope: data.scope,
    });

    db.saveIntegration('shopify', { shop_domain: shop }, 'configured');

    db.addLog(
      'SHOPIFY',
      'SUCCESS',
      'OAUTH_TOKEN_ACQUIRED',
      `Autenticación OAuth exitosa para la tienda ${shop}. Token persistido.`
    );

    return NextResponse.redirect(new URL('/dashboard/integraciones?success=shopify_connected', req.url));
  } catch (err: any) {
    db.addLog('SHOPIFY', 'ERROR', 'OAUTH_EXCEPTION', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
