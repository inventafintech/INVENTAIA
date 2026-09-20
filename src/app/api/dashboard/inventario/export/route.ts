import { NextRequest, NextResponse } from 'next/server';
import { InventoryMasterService } from '@/services/InventoryMasterService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || 'all';

    let items = InventoryMasterService.getInventoryItems();

    if (search) {
      const q = search.toLowerCase();
      items = items.filter(
        (i) => i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q)
      );
    }

    if (category !== 'all') {
      items = items.filter(
        (i) => i.category.toLowerCase() === category.toLowerCase()
      );
    }

    const csvContent = InventoryMasterService.generateCsv(items);
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
