import { NextResponse } from 'next/server';
import { requireWorkspace } from '@/lib/requireWorkspace';
import { db } from '@/lib/db';

export async function POST() {
  const auth = await requireWorkspace();
  if (auth.error) return auth.error;
  const tokenRecord = db.getOAuthToken('shopify');
  const integration = db.getIntegration('shopify');

  // Check if token or manual API key exists
  const accessToken = tokenRecord?.access_token || integration?.config?.access_token;
  const shopDomain = tokenRecord?.shop_domain || integration?.config?.shop_domain;

  if (!accessToken || !shopDomain) {
    db.addLog(
      'SHOPIFY',
      'ERROR',
      'SYNC_FAILED',
      'Sincronización rechazada: No existen credenciales activas para Shopify. Estado: Pendiente de configuración.'
    );
    return NextResponse.json(
      { 
        error: 'Conexión no configurada', 
        message: 'No existen credenciales activas para Shopify. Inicie sesión vía OAuth o ingrese un Access Token válido en Ajustes.' 
      },
      { status: 400 }
    );
  }

  const job = db.createSyncJob(integration?.id || 'int-shopify', 'full');

  try {
    // Real call to Shopify REST API
    const productsRes = await fetch(`https://${shopDomain}/admin/api/2024-01/products.json?limit=50`, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    });

    if (!productsRes.ok) {
      const errorText = await productsRes.text();
      db.updateSyncJob(job.id, 'failed', `Shopify API Error (${productsRes.status}): ${errorText}`);
      db.addLog(
        'SHOPIFY',
        'ERROR',
        'SYNC_FAILED',
        `Error HTTP ${productsRes.status} al consultar /products.json: ${errorText}`
      );
      return NextResponse.json(
        { error: 'Error consultando API de Shopify', status: productsRes.status, details: errorText },
        { status: productsRes.status }
      );
    }

    const productsData = await productsRes.json();
    const productCount = productsData.products ? productsData.products.length : 0;

    // Call Orders
    const ordersRes = await fetch(`https://${shopDomain}/admin/api/2024-01/orders.json?status=any&limit=50`, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    });
    const ordersData = ordersRes.ok ? await ordersRes.json() : { orders: [] };
    const orderCount = ordersData.orders ? ordersData.orders.length : 0;

    // Call Inventory Levels
    let inventoryCount = 0;
    try {
      const invRes = await fetch(`https://${shopDomain}/admin/api/2024-01/inventory_levels.json?limit=50`, {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
      });
      if (invRes.ok) {
        const invData = await invRes.json();
        inventoryCount = invData.inventory_levels ? invData.inventory_levels.length : 0;
      }
    } catch {
      // Ignore optional inventory error if scope not granted
    }

    db.saveSyncResult(job.id, 'products', productCount, 0, { sample: productsData.products?.slice(0, 3) });
    db.saveSyncResult(job.id, 'orders', orderCount, 0);
    db.saveSyncResult(job.id, 'inventory', inventoryCount, 0);
    db.updateSyncJob(job.id, 'completed');

    db.addLog(
      'shopify',
      'SUCCESS',
      'SYNC_COMPLETED',
      'EXITOSO',
      `Sincronización real exitosa: ${productCount} productos, ${orderCount} pedidos, ${inventoryCount} niveles de inventario conciliados desde ${shopDomain}.`
    );

    return NextResponse.json({
      success: true,
      shop: shopDomain,
      products_synced: productCount,
      orders_synced: orderCount,
      inventory_synced: inventoryCount,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    db.updateSyncJob(job.id, 'failed', err.message);
    db.addLog('SHOPIFY', 'ERROR', 'SYNC_EXCEPTION', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
