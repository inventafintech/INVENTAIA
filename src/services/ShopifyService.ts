import { createClient } from '@/utils/supabase/server';
import { IntegrationService } from './IntegrationService';

export class ShopifyService {
  /**
   * Genera la URL oficial de autorización OAuth 2.0 para una tienda de Shopify.
   */
  static getAuthUrl(shopDomain: string, redirectUri: string): string {
    const apiKey = process.env.SHOPIFY_API_KEY || 'fake-shopify-key';
    const scopes = 'read_products,write_products,read_orders,read_inventory';
    const cleanShop = shopDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    return `https://${cleanShop}/admin/oauth/authorize?client_id=${apiKey}&scope=${scopes}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}`;
  }

  /**
   * Intercambia el código de autorización temporal por un Access Token permanente de Shopify.
   */
  static async exchangeCodeForToken(shopDomain: string, code: string): Promise<string> {
    const apiKey = process.env.SHOPIFY_API_KEY;
    const apiSecret = process.env.SHOPIFY_API_SECRET;
    const cleanShop = shopDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');

    if (!apiKey || !apiSecret) {
      throw new Error('Configuración de credenciales de Shopify incompletas en variables de entorno.');
    }

    const res = await fetch(`https://${cleanShop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: apiKey,
        client_secret: apiSecret,
        code,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Falló el intercambio de token con Shopify: ${errorText}`);
    }

    const data = await res.json();
    return data.access_token;
  }

  /**
   * Sincroniza catálogo de productos reales desde Shopify hacia Supabase.
   */
  static async syncProducts(workspaceId: string, shopDomain: string, accessToken: string) {
    const cleanShop = shopDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const res = await fetch(`https://${cleanShop}/admin/api/2026-01/products.json?limit=50`, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`Error HTTP al consultar productos de Shopify: ${res.statusText}`);
    }

    const data = await res.json();
    const products = data.products || [];
    const supabase = await createClient();

    let count = 0;
    for (const p of products) {
      const variant = p.variants?.[0];
      if (variant) {
        await supabase.from('products').upsert({
          id: `shp-${p.id}`,
          sku_code: variant.sku || `SKU-SHP-${p.id}`,
          name: p.title,
          unit_cost: Number(variant.price) * 0.6, // Costo estimado o de lista
          unit_price: Number(variant.price),
          status: 'active',
          updated_at: new Date().toISOString(),
        });
        count++;
      }
    }

    await IntegrationService.logIntegrationEvent(
      workspaceId,
      'sistema@inventa.ai',
      'Shopify',
      'EXITOSO',
      `Sincronizados ${count} productos correctamente desde ${cleanShop}.`
    );

    return count;
  }
}
