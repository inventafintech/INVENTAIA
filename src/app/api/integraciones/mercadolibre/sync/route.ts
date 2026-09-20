import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST() {
  const tokenRecord = db.getOAuthToken('mercadolibre');
  const integration = db.getIntegration('mercadolibre');

  const accessToken = tokenRecord?.access_token || integration?.config?.access_token;
  const userId = integration?.config?.user_id;

  if (!accessToken) {
    db.addLog(
      'MERCADOLIBRE',
      'ERROR',
      'SYNC_FAILED',
      'Sincronización rechazada: No existe token OAuth activo para Mercado Libre. Estado: Pendiente de configuración.'
    );
    return NextResponse.json(
      { 
        error: 'Conexión no configurada', 
        message: 'No existe token OAuth activo para Mercado Libre. Inicie el flujo de autorización OAuth en Ajustes.' 
      },
      { status: 400 }
    );
  }

  const job = db.createSyncJob(integration?.id || 'int-meli', 'full');

  try {
    // Real call to Mercado Libre API
    const itemsRes = await fetch(`https://api.mercadolibre.com/users/${userId || 'me'}/items/search?limit=50`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!itemsRes.ok) {
      const errorText = await itemsRes.text();
      db.updateSyncJob(job.id, 'failed', `Mercado Libre Error (${itemsRes.status}): ${errorText}`);
      db.addLog('MERCADOLIBRE', 'ERROR', 'SYNC_FAILED', `Error HTTP ${itemsRes.status}: ${errorText}`);
      return NextResponse.json(
        { error: 'Error consultando API de Mercado Libre', status: itemsRes.status, details: errorText },
        { status: itemsRes.status }
      );
    }

    const itemsData = await itemsRes.json();
    const totalItems = itemsData.results ? itemsData.results.length : 0;

    // Call Orders
    const ordersRes = await fetch(`https://api.mercadolibre.com/orders/search?seller=${userId || 'me'}&limit=50`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const ordersData = ordersRes.ok ? await ordersRes.json() : { results: [] };
    const totalOrders = ordersData.results ? ordersData.results.length : 0;

    db.saveSyncResult(job.id, 'publications', totalItems, 0);
    db.saveSyncResult(job.id, 'sales', totalOrders, 0);

    // Fetch Stock / Items details if available
    let totalStock = 0;
    if (itemsData.results && itemsData.results.length > 0) {
      const itemIds = itemsData.results.slice(0, 20).join(',');
      try {
        const multigetRes = await fetch(`https://api.mercadolibre.com/items?ids=${itemIds}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (multigetRes.ok) {
          const multigetData = await multigetRes.json();
          totalStock = (multigetData || []).reduce((acc: number, item: any) => {
            return acc + (item.body?.available_quantity || 0);
          }, 0);
        }
      } catch {
        // Continue
      }
    }
    db.saveSyncResult(job.id, 'stock', totalStock, 0);
    db.updateSyncJob(job.id, 'completed');

    db.addLog(
      'mercadolibre',
      'SUCCESS',
      'SYNC_COMPLETED',
      'EXITOSO',
      `Sincronización real completada: ${totalItems} publicaciones, ${totalOrders} ventas, ${totalStock} unidades en stock.`
    );

    return NextResponse.json({
      success: true,
      publications_synced: totalItems,
      orders_synced: totalOrders,
      stock_synced: totalStock,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    db.updateSyncJob(job.id, 'failed', err.message);
    db.addLog('MERCADOLIBRE', 'ERROR', 'SYNC_EXCEPTION', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
