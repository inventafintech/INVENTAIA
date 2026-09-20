import { db } from '@/lib/db';

export class SapService {
  /**
   * Syncs SAP S/4HANA OData / REST instances
   */
  public static async syncAll(): Promise<{
    success: boolean;
    products_synced: number;
    business_partners_synced: number;
    job_id: string;
  }> {
    const integration = db.getIntegration('sap');
    const sapHost = process.env.SAP_HOST || integration?.config?.host;
    const sapUser = process.env.SAP_USERNAME || integration?.config?.username;
    const sapPassword = process.env.SAP_PASSWORD || integration?.config?.password;
    const sapApiKey = process.env.SAP_API_KEY || integration?.config?.api_key;
    const sapClient = process.env.SAP_CLIENT || integration?.config?.client || '100';

    if (!sapHost || (!sapApiKey && (!sapUser || !sapPassword))) {
      db.addLog(
        'sap',
        'WARN',
        'SYNC_REQUEST',
        'FALLIDO',
        'Conector disponible. Instancia SAP no configurada.'
      );
      throw new Error('Conector disponible. Instancia SAP no configurada.');
    }

    const job = db.createSyncJob('int-sap', 'SAP_S4HANA_ODATA_FULL_SYNC');

    try {
      const headers: Record<string, string> = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'sap-client': sapClient,
      };

      if (sapApiKey) {
        headers['APIKey'] = sapApiKey;
      } else if (sapUser && sapPassword) {
        const auth = Buffer.from(`${sapUser}:${sapPassword}`).toString('base64');
        headers['Authorization'] = `Basic ${auth}`;
      }

      // Query Products (API_PRODUCT_SRV)
      const prodUrl = `${sapHost.replace(/\/$/, '')}/sap/opu/odata/sap/API_PRODUCT_SRV/A_Product?$top=50&$format=json`;
      const prodRes = await fetch(prodUrl, { headers, cache: 'no-store' });

      let productsCount = 0;
      if (prodRes.ok) {
        const data = await prodRes.json();
        const results = data.d?.results || data.value || [];
        productsCount = results.length;
        db.saveSyncResult(job.id, 'SAP_PRODUCTS', productsCount, 0, { sample: results.slice(0, 3) });
      }

      // Query Business Partners (API_BUSINESS_PARTNER)
      const bpUrl = `${sapHost.replace(/\/$/, '')}/sap/opu/odata/sap/API_BUSINESS_PARTNER/A_BusinessPartner?$top=50&$format=json`;
      const bpRes = await fetch(bpUrl, { headers, cache: 'no-store' });

      let bpCount = 0;
      if (bpRes.ok) {
        const data = await bpRes.json();
        const results = data.d?.results || data.value || [];
        bpCount = results.length;
        db.saveSyncResult(job.id, 'SAP_BUSINESS_PARTNERS', bpCount, 0, { sample: results.slice(0, 3) });
      }

      db.updateSyncJob(job.id, 'completed');
      db.addLog(
        'sap',
        'SUCCESS',
        'SYNC_ODATA',
        'EXITOSO',
        `Sincronización SAP OData completada: ${productsCount} productos, ${bpCount} socios comerciales.`
      );

      return {
        success: true,
        products_synced: productsCount,
        business_partners_synced: bpCount,
        job_id: job.id,
      };
    } catch (error: any) {
      db.updateSyncJob(job.id, 'failed', error.message);
      db.addLog('sap', 'ERROR', 'SYNC_ODATA', 'FALLIDO', error.message);
      throw error;
    }
  }
}
