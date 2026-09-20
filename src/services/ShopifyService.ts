import { db } from '@/lib/db';
import { SyncResult } from '@/types';

export class ShopifyService {
  private static readonly API_VERSION = '2024-01';

  /**
   * Generates official Shopify OAuth authorization URL
   */
  public static getAuthorizationUrl(shopDomain: string, redirectUri: string, state: string): string {
    const cleanDomain = shopDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const scopes = 'read_products,read_orders,read_inventory,write_inventory';
    const clientId = process.env.SHOPIFY_CLIENT_ID || 'shopify_client_id_placeholder';
    return `https://${cleanDomain}/admin/oauth/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
  }

  /**
   * Exchanges OAuth authorization code for permanent access token
   */
  public static async exchangeCodeForToken(shopDomain: string, code: string): Promise<string> {
    const cleanDomain = shopDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const clientId = process.env.SHOPIFY_CLIENT_ID;
    const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('SHOPIFY_CLIENT_ID o SHOPIFY_CLIENT_SECRET no configurados en las variables de entorno.');
    }

    const response = await fetch(`https://${cleanDomain}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error en intercambio de token Shopify (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const accessToken = data.access_token;

    // Save token in DB repository
    db.saveOAuthToken('shopify', {
      shop_domain: cleanDomain,
      access_token: accessToken,
      scope: data.scope,
    });

    db.addLog(
      'shopify',
      'SUCCESS',
      'OAUTH_TOKEN_EXCHANGED',
      'EXITOSO',
      `Token de acceso OAuth obtenido exitosamente para tienda ${cleanDomain}.`
    );

    return accessToken;
  }

  /**
   * Performs real API synchronization of /products, /orders, /inventory
   */
  public static async syncAll(): Promise<{
    success: boolean;
    products_synced: number;
    orders_synced: number;
    inventory_synced: number;
    job_id: string;
  }> {
    const tokenRecord = db.getOAuthToken('shopify');
    const integration = db.getIntegration('shopify');

    const accessToken = tokenRecord?.access_token || integration?.config?.access_token;
    const shopDomain = tokenRecord?.shop_domain || integration?.config?.shop_domain;

    if (!accessToken || !shopDomain) {
      db.addLog(
        'shopify',
        'WARN',
        'SYNC_REJECTED',
        'FALLIDO',
        'Sincronización rechazada: No existen credenciales activas para Shopify. Estado: Pendiente de configuración.'
      );
      throw new Error('No existen credenciales activas para Shopify. Inicie el flujo OAuth o ingrese credenciales en Ajustes.');
    }

    const job = db.createSyncJob(integration?.id || 'int-shopify', 'SHOPIFY_FULL_SYNC');

    try {
      // 1. Fetch Products
      const prodRes = await fetch(`https://${shopDomain}/admin/api/${this.API_VERSION}/products.json?limit=50`, {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
      });

      if (!prodRes.ok) {
        const errText = await prodRes.text();
        throw new Error(`Fallo al consultar /products.json (${prodRes.status}): ${errText}`);
      }

      const prodData = await prodRes.json();
      const products = prodData.products || [];
      const productsCount = products.length;

      // 2. Fetch Orders
      const ordersRes = await fetch(`https://${shopDomain}/admin/api/${this.API_VERSION}/orders.json?status=any&limit=50`, {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
      });
      const ordersData = ordersRes.ok ? await ordersRes.json() : { orders: [] };
      const orders = ordersData.orders || [];
      const ordersCount = orders.length;

      // 3. Fetch Inventory Levels
      let inventoryCount = 0;
      try {
        const invRes = await fetch(`https://${shopDomain}/admin/api/${this.API_VERSION}/inventory_levels.json?limit=50`, {
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json',
          },
        });
        if (invRes.ok) {
          const invData = await invRes.json();
          inventoryCount = invData.inventory_levels?.length || 0;
        }
      } catch {
        // Continue if inventory levels scope is restricted
      }

      // Persist results into database
      db.saveSyncResult(job.id, 'products', productsCount, 0, { sample: products.slice(0, 5) });
      db.saveSyncResult(job.id, 'orders', ordersCount, 0, { sample: orders.slice(0, 5) });
      db.saveSyncResult(job.id, 'inventory', inventoryCount, 0);
      db.updateSyncJob(job.id, 'completed');

      db.addLog(
        'shopify',
        'SUCCESS',
        'SYNC_COMPLETED',
        'EXITOSO',
        `Sincronización real completada: ${productsCount} productos, ${ordersCount} órdenes, ${inventoryCount} registros de inventario conciliados desde ${shopDomain}.`
      );

      return {
        success: true,
        products_synced: productsCount,
        orders_synced: ordersCount,
        inventory_synced: inventoryCount,
        job_id: job.id,
      };

    } catch (error: any) {
      db.updateSyncJob(job.id, 'failed', error.message);
      db.addLog('shopify', 'ERROR', 'SYNC_ERROR', 'FALLIDO', error.message);
      throw error;
    }
  }
}
