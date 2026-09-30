import { NextRequest, NextResponse } from 'next/server';
import { InventoryMasterService } from '@/services/InventoryMasterService';
import { normalizeLocationFilter } from '@/services/LocationsService';
import { requireWorkspace } from '@/lib/requireWorkspace';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    // location_id = ref de ubicación (LOC-00004); branch = sucursal. 'all' = todo.
    const filter = normalizeLocationFilter(
      params.get('location_id') || params.get('locationId') || params.get('location'),
      params.get('branch')
    );
    const items = await InventoryMasterService.getInventoryItems(filter);
    const metrics = await InventoryMasterService.getInventoryMetrics(filter);
    
    const supabase = await createClient();
    const { data: categories } = await supabase.from('categories').select('*');

    return NextResponse.json({
      success: true,
      items,
      metrics,
      categories,
      locationFilter: filter,
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
    const auth = await requireWorkspace();
    if (auth.error) return auth.error;
    const body = await req.json();
    const { skuCode, name, categoryName, unitCost, unitPrice, physicalStock, safetyStock } = body;
    const rawLoc = typeof body?.locationRef === 'string' ? body.locationRef.trim().toUpperCase()
      : typeof body?.location_id === 'string' ? body.location_id.trim().toUpperCase() : '';
    const rawBranch = typeof body?.branch === 'string' ? body.branch.trim().slice(0, 120) : '';

    if (!skuCode || !name || !categoryName || unitCost === undefined || unitPrice === undefined) {
      return NextResponse.json(
        { success: false, error: 'Campos obligatorios faltantes: skuCode, name, categoryName, unitCost, unitPrice.' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    // Buscar o crear la categoría real
    let categoryId = null;
    const { data: catExists } = await supabase.from('categories').select('id').eq('name', categoryName).single();
    
    if (catExists) {
      categoryId = catExists.id;
    } else {
      const { data: newCat } = await supabase.from('categories').insert({ name: categoryName }).select('id').single();
      categoryId = newCat?.id;
    }

    if (!categoryId) {
      throw new Error("No se pudo resolver la categoría.");
    }

    // Insertar el producto
    const { data: product, error: prodError } = await supabase.from('products').insert({
      sku_code: skuCode,
      name,
      category_id: categoryId,
      unit_cost: Number(unitCost),
      unit_price: Number(unitPrice),
      status: 'active'
    }).select().single();

    if (prodError || !product) {
       throw new Error(prodError?.message || "Error al crear producto");
    }

    // Insertar inventario inicial
    await supabase.from('inventory_levels').insert({
      product_id: product.id,
      physical_stock: Number(physicalStock || 0),
      safety_stock: Number(safetyStock || 0)
    });

    // Placement real: si el frontend indica ubicación, se persiste para que
    // el SKU nazca dentro de esa ubicación y el filtro location_id lo incluya.
    if (rawLoc && rawLoc !== 'ALL') {
      const { data: ws } = await supabase.from('workspaces').select('id,settings').limit(1).maybeSingle();
      if (ws?.id) {
        const settings = { ...(((ws.settings as any) || {})) };
        const placement = { ...(settings.inventoryPlacement || {}) };
        placement[product.id] = { branch: rawBranch || 'Sede Lima Central', locationRef: rawLoc };
        settings.inventoryPlacement = placement;
        await supabase.from('workspaces').update({ settings }).eq('id', ws.id);
      }
    }

    return NextResponse.json({
      success: true,
      item: product,
      message: `SKU ${product.sku_code} creado exitosamente en el Maestro de Inventario.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Error al crear SKU en inventario' },
      { status: 500 }
    );
  }
}
