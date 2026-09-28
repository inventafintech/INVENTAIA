import { NextRequest, NextResponse } from 'next/server';
import { InventoryMasterService } from '@/services/InventoryMasterService';
import { normalizeLocationFilter } from '@/services/LocationsService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || 'all';
    const health = searchParams.get('health') || 'all';
    const filter = normalizeLocationFilter(
      searchParams.get('location_id') || searchParams.get('locationId') || searchParams.get('location'),
      searchParams.get('branch')
    );

    let items = await InventoryMasterService.getInventoryItems(filter);

    if (search) {
      const q = search.toLowerCase();
      items = items.filter(
        (i: any) => i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q)
      );
    }

    if (category !== 'all') {
      items = items.filter(
        (i: any) => i.category.toLowerCase() === category.toLowerCase()
      );
    }

    if (health !== 'all') {
      items = items.filter((i: any) => i.health === health);
    }

    const headers = ['SKU', 'Nombre', 'Categoría', 'Stock Físico', 'Stock Seguridad', 'Costo Unitario', 'Precio Unitario', 'Valor Total', 'GMROI', 'Estado Salud'];
    const rows = items.map((item: any) => [
      item.sku,
      `"${item.name}"`,
      `"${item.category}"`,
      item.physicalStock,
      item.safetyStock,
      item.unitCost,
      item.unitPrice,
      item.totalValue,
      item.gmroi,
      item.healthLabel
    ]);
    const csvContent = [headers.join(','), ...rows.map((row: any) => row.join(','))].join('\n');
    const dateStr = new Date().toISOString().split('T')[0];

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="inventario_${dateStr}.csv"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Error al exportar inventario a CSV' },
      { status: 500 }
    );
  }
}
