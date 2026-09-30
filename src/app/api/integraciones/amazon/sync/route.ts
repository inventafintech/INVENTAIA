import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspace } from '@/lib/requireWorkspace';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  const auth = await requireWorkspace();
  if (auth.error) return auth.error;
  const integration = db.getIntegration('amazon');
  const token = db.getOAuthToken('amazon');

  const clientId = process.env.AMAZON_CLIENT_ID || integration?.config?.client_id;
  const clientSecret = process.env.AMAZON_CLIENT_SECRET || integration?.config?.client_secret;
  const refreshToken = process.env.AMAZON_REFRESH_TOKEN || token?.refresh_token || integration?.config?.refresh_token;

  if (!clientId || !clientSecret || !refreshToken) {
    db.addLog(
      'amazon',
      'WARN',
      'SYNC_SP_API',
      'FALLIDO',
      'Credenciales de Amazon Selling Partner API no configuradas (LWA Client ID, Secret o Refresh Token faltante).'
    );

    return NextResponse.json(
      {
        success: false,
        status: 'unconfigured',
        message: 'Credenciales de Amazon SP-API no configuradas. Conector en estado Pendiente de configuración.'
      },
      { status: 400 }
    );
  }

  const job = db.createSyncJob('int-amazon', 'AMAZON_FBA_INVENTORY_SYNC');

  try {
    // Exchange LWA token
    const tokenRes = await fetch('https://api.amazon.com/auth/o2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret
      })
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      throw new Error(`Error autenticación LWA: ${errText}`);
    }

    const tokenData = await tokenRes.json();
    const lwaAccessToken = tokenData.access_token;

    // Fetch FBA Inventory Summaries
    const inventoryRes = await fetch(
      'https://sellingpartnerapi-na.amazon.com/fba/inventory/v1/summaries?details=true&granularityType=Marketplace&granularityId=ATVPDKIKX0DER&startDateTime=2026-01-01T00:00:00Z',
      {
        headers: {
          'x-amz-access-token': lwaAccessToken,
          'Content-Type': 'application/json'
        }
      }
    );

    let itemsCount = 0;
    if (inventoryRes.ok) {
      const invData = await inventoryRes.json();
      const summaries = invData.payload?.inventorySummaries || [];
      itemsCount = summaries.length;
      db.saveSyncResult(job.id, 'AMAZON_FBA_INVENTORY', itemsCount, 0, { summaries: summaries.slice(0, 5) });
    }

    db.updateSyncJob(job.id, 'completed');
    db.addLog(
      'amazon',
      'SUCCESS',
      'SYNC_SP_API',
      'EXITOSO',
      `Sincronización de inventario FBA Amazon completada: ${itemsCount} SKUs conciliados.`
    );

    return NextResponse.json({
      success: true,
      job_id: job.id,
      products_synced: itemsCount,
      status: 'completed'
    });

  } catch (error: any) {
    db.updateSyncJob(job.id, 'failed', error.message);
    db.addLog(
      'amazon',
      'ERROR',
      'SYNC_SP_API',
      'FALLIDO',
      `Fallo al sincronizar con Amazon SP-API: ${error.message}`
    );

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 502 }
    );
  }
}
