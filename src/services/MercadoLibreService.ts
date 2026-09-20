import { db } from '@/lib/db';

export class MercadoLibreService {
  private static readonly BASE_URL = 'https://api.mercadolibre.com';

  /**
   * Generates official Mercado Libre OAuth authorization URL
   */
  public static getAuthorizationUrl(redirectUri: string): string {
    const appId = process.env.MERCADOLIBRE_APP_ID || '74819';
    return `https://auth.mercadolibre.com.ar/authorization?response_type=code&client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}`;
  }

  /**
   * Exchanges OAuth authorization code for access token and refresh token
   */
  public static async exchangeCodeForToken(code: string, redirectUri: string): Promise<{
    access_token: string;
    refresh_token: string;
    user_id: number;
    expires_in: number;
  }> {
    const appId = process.env.MERCADOLIBRE_APP_ID;
    const clientSecret = process.env.MERCADOLIBRE_CLIENT_SECRET;

    if (!appId || !clientSecret) {
      throw new Error('MERCADOLIBRE_APP_ID o MERCADOLIBRE_CLIENT_SECRET no configurados en el entorno.');
    }

    const response = await fetch(`${this.BASE_URL}/oauth/token`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: appId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Error en intercambio de token Mercado Libre (${response.status}): ${errText}`);
    }

    const data = await response.json();

    // Save token in DB repository
    db.saveOAuthToken('mercadolibre', {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      scope: data.scope,
      expires_at: new Date(Date.now() + (data.expires_in || 21600) * 1000).toISOString(),
    });

    // Update integration config with user_id
    db.saveIntegration('mercadolibre', { user_id: data.user_id }, 'configured');

    db.addLog(
      'mercadolibre',
      'SUCCESS',
      'OAUTH_TOKEN_EXCHANGED',
      'EXITOSO',
      `Token OAuth oficial obtenido para usuario de Mercado Libre ID: ${data.user_id}.`
    );

    return data;
  }

  /**
   * Performs real API synchronization of publications, orders (sales), and stock
   */
  public static async syncAll(): Promise<{
    success: boolean;
    publications_synced: number;
    orders_synced: number;
    stock_synced: number;
    job_id: string;
  }> {
    const tokenRecord = db.getOAuthToken('mercadolibre');
    const integration = db.getIntegration('mercadolibre');

    const accessToken = tokenRecord?.access_token || integration?.config?.access_token;
    const userId = integration?.config?.user_id || 'me';

    if (!accessToken) {
      db.addLog(
        'mercadolibre',
        'WARN',
        'SYNC_REJECTED',
        'FALLIDO',
        'Sincronización rechazada: No existe token OAuth activo para Mercado Libre. Estado: Pendiente de configuración.'
      );
      throw new Error('No existe token OAuth activo para Mercado Libre. Inicie el flujo de autorización OAuth en Ajustes.');
    }

    const job = db.createSyncJob(integration?.id || 'int-meli', 'MERCADOLIBRE_FULL_SYNC');

    try {
      // 1. Fetch Publications (/users/me/items/search)
      const itemsRes = await fetch(`${this.BASE_URL}/users/${userId}/items/search?limit=50`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!itemsRes.ok) {
        const errText = await itemsRes.text();
        throw new Error(`Fallo al consultar publicaciones de Mercado Libre (${itemsRes.status}): ${errText}`);
      }

      const itemsData = await itemsRes.json();
      const publicationsCount = itemsData.results?.length || 0;

      // 2. Fetch Orders / Sales (/orders/search)
      const ordersRes = await fetch(`${this.BASE_URL}/orders/search?seller=${userId}&limit=50`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const ordersData = ordersRes.ok ? await ordersRes.json() : { results: [] };
      const ordersCount = ordersData.results?.length || 0;

      // 3. Fetch Stock for items
      let totalStock = 0;
      if (itemsData.results && itemsData.results.length > 0) {
        const itemIds = itemsData.results.slice(0, 20).join(',');
        try {
          const multigetRes = await fetch(`${this.BASE_URL}/items?ids=${itemIds}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (multigetRes.ok) {
            const multigetData = await multigetRes.json();
            totalStock = (multigetData || []).reduce((acc: number, item: any) => {
              return acc + (item.body?.available_quantity || 0);
            }, 0);
          }
        } catch {
          // Continue if multiget fails
        }
      }

      // Persist results into database
      db.saveSyncResult(job.id, 'publications', publicationsCount, 0, { sample: itemsData.results?.slice(0, 5) });
      db.saveSyncResult(job.id, 'sales', ordersCount, 0);
      db.saveSyncResult(job.id, 'stock', totalStock, 0);
      db.updateSyncJob(job.id, 'completed');

      db.addLog(
        'mercadolibre',
        'SUCCESS',
        'SYNC_COMPLETED',
        'EXITOSO',
        `Sincronización real completada: ${publicationsCount} publicaciones, ${ordersCount} ventas, ${totalStock} unidades en stock conciliadas.`
      );

      return {
        success: true,
        publications_synced: publicationsCount,
        orders_synced: ordersCount,
        stock_synced: totalStock,
        job_id: job.id,
      };

    } catch (error: any) {
      db.updateSyncJob(job.id, 'failed', error.message);
      db.addLog('mercadolibre', 'ERROR', 'SYNC_ERROR', 'FALLIDO', error.message);
      throw error;
    }
  }
}
