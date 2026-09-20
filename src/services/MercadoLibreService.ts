import { createClient } from '@/utils/supabase/server';
import { IntegrationService } from './IntegrationService';

export class MercadoLibreService {
  /**
   * Genera la URL oficial de autorización OAuth 2.0 para Mercado Libre.
   */
  static getAuthUrl(redirectUri: string): string {
    const appId = process.env.MELI_APP_ID || 'fake-meli-app-id';
    return `https://auth.mercadolibre.com.pe/authorization?response_type=code&client_id=${appId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}`;
  }

  /**
   * Intercambia el código de autorización temporal por un Access Token y Refresh Token de Mercado Libre.
   */
  static async exchangeCodeForToken(code: string, redirectUri: string) {
    const appId = process.env.MELI_APP_ID;
    const clientSecret = process.env.MELI_CLIENT_SECRET;

    if (!appId || !clientSecret) {
      throw new Error('Configuración de credenciales de Mercado Libre incompletas en variables de entorno.');
    }

    const res = await fetch('https://api.mercadolibre.com/oauth/token', {
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

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Falló la autenticación con Mercado Libre: ${errorText}`);
    }

    return await res.json();
  }

  /**
   * Consulta las publicaciones del vendedor en Mercado Libre.
   */
  static async syncItems(workspaceId: string, userId: string, accessToken: string) {
    const res = await fetch(`https://api.mercadolibre.com/users/${userId}/items/search`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      throw new Error(`Error al listar items de Mercado Libre: ${res.statusText}`);
    }

    const data = await res.json();
    const itemIds: string[] = data.results || [];
    const supabase = await createClient();

    let count = 0;
    if (itemIds.length > 0) {
      const detailsRes = await fetch(`https://api.mercadolibre.com/items?ids=${itemIds.slice(0, 20).join(',')}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (detailsRes.ok) {
        const detailsData = await detailsRes.json();
        for (const entry of detailsData) {
          const item = entry.body;
          if (item && item.id) {
            await supabase.from('products').upsert({
              id: `mli-${item.id}`,
              sku_code: item.seller_custom_field || `SKU-MLI-${item.id}`,
              name: item.title,
              unit_cost: Number(item.price) * 0.6,
              unit_price: Number(item.price),
              status: 'active',
              updated_at: new Date().toISOString(),
            });
            count++;
          }
        }
      }
    }

    await IntegrationService.logIntegrationEvent(
      workspaceId,
      'sistema@inventa.ai',
      'Mercado Libre',
      'EXITOSO',
      `Sincronizados ${count} ítems de Mercado Libre.`
    );

    return count;
  }
}
