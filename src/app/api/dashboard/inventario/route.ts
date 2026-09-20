import { NextRequest, NextResponse } from 'next/server';
import { InventoryMasterService } from '@/services/InventoryMasterService';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const items = InventoryMasterService.getInventoryItems();
    const metrics = InventoryMasterService.getInventoryMetrics();
    const categories = db.getCategories();

    return NextResponse.json({
      success: true,
      items,
      metrics,
      categories,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Error al obtener maestro de inventario' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { skuCode, name, categoryName, unitCost, unitPrice, physicalStock, safetyStock } = body;

    if (!skuCode || !name || !categoryName || unitCost === undefined || unitPrice === undefined) {
      return NextResponse.json(
        { success: false, error: 'Campos obligatorios faltantes: skuCode, name, categoryName, unitCost, unitPrice.' },
        { status: 400 }
      );
    }

    const newItem = InventoryMasterService.createNewSku(
      skuCode,
      name,
      categoryName,
      Number(unitCost),
      Number(unitPrice),
      Number(physicalStock || 0),
      Number(safetyStock || 0)
    );

    return NextResponse.json({
      success: true,
      item: newItem,
      message: `SKU ${newItem.sku} creado exitosamente en el Maestro de Inventario.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Error al crear SKU en inventario' },
      { status: 500 }
    );
  }
}
