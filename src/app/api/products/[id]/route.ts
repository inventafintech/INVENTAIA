import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspace } from '@/lib/requireWorkspace';
import { computeRestockItem } from '@/services/RestockCalculatorService';

export const dynamic = 'force-dynamic';

async function findProduct(supabase: any, idOrSku: string) {
  let { data } = await supabase.from('products').select('*').eq('id', idOrSku).maybeSingle();
  if (!data) {
    const bySku = await supabase.from('products').select('*').eq('sku_code', idOrSku).maybeSingle();
    data = bySku.data || null;
  }
  return data;
}

/**
 * GET /api/products/[id|sku]
 * Ficha completa: producto + nivel de stock + proveedor (historial OC o
 * catálogo) + cálculo ROP + historial de órdenes de compra del SKU.
 */
export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireWorkspace();
    if (auth.error) return auth.error;
    const { id } = await context.params;
    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();

    const product = await findProduct(supabase, decodeURIComponent(id));
    if (!product) {
      return NextResponse.json({ error: 'Producto no encontrado.' }, { status: 404 });
    }

    const [{ data: level }, { data: categories }, { data: suppliers }, { data: lines }] = await Promise.all([
      supabase.from('inventory_levels').select('physical_stock,safety_stock').eq('product_id', product.id).maybeSingle(),
      supabase.from('categories').select('id,name'),
      supabase.from('suppliers').select('id,name,integration_type,lead_time_days,contact_info'),
      supabase.from('purchase_order_lines').select('po_id,quantity,unit_price').eq('sku', product.sku_code).limit(50),
    ]);

    const catById = new Map((categories || []).map((c: any) => [c.id, c.name]));
    const supplierInfos: Array<{
      id: string;
      name: string;
      type: 'corporate' | 'traditional';
      phone?: string;
      leadTimeDays: number;
      skus: string[];
    }> = (suppliers || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      type: s.integration_type === 'corporate' ? 'corporate' : 'traditional',
      phone: (s.contact_info as any)?.phone || (s.contact_info as any)?.email,
      leadTimeDays: Number(s.lead_time_days) || 0,
      skus: Array.isArray((s.contact_info as any)?.skus) ? (s.contact_info as any).skus : [],
    }));

    let orders: any[] = [];
    let supplier = supplierInfos.find((s) => s.skus.includes(product.sku_code));
    const allLines: any[] = lines || [];
    if (allLines.length > 0) {
      const poIds = [...new Set(allLines.map((l: any) => l.po_id))];
      const { data: pos } = await supabase
        .from('purchase_orders')
        .select('id,order_number,supplier_id,condition,total_amount,status,created_at')
        .in('id', poIds)
        .order('created_at', { ascending: false });
      orders = (pos || []).map((o: any) => ({
        id: o.id,
        orderNumber: o.order_number,
        supplierId: o.supplier_id,
        condition: o.condition,
        total: Number(o.total_amount) || 0,
        status: o.status,
        createdAt: o.created_at,
        lines: allLines
          .filter((l: any) => l.po_id === o.id)
          .map((l: any) => ({ quantity: l.quantity, unitPrice: Number(l.unit_price) || 0 })),
      }));
      const lastSupplier = supplierInfos.find((s) => s.id === orders[0]?.supplierId);
      if (lastSupplier) supplier = lastSupplier;
    }

    const restock = computeRestockItem({
      id: product.id,
      sku: product.sku_code,
      name: product.name,
      unitCost: Number(product.unit_cost) || 0,
      currentStock: Number(level?.physical_stock ?? 0),
      safetyStock: Number(level?.safety_stock ?? 0),
      leadTimeDays: supplier?.leadTimeDays ?? 0,
      provider: supplier?.name || 'Sin asignar',
      providerId: supplier?.id || null,
      providerType: supplier?.type || 'traditional',
      providerPhone: supplier?.phone,
    });

    const price = Number(product.unit_price) || 0;
    const cost = Number(product.unit_cost) || 0;

    return NextResponse.json({
      success: true,
      item: {
        id: product.id,
        sku: product.sku_code,
        name: product.name,
        price,
        cost,
        margin: price > 0 ? Number((((price - cost) / price) * 100).toFixed(1)) : 0,
        status: product.status,
        categoryId: product.category_id,
        category: catById.get(product.category_id) || null,
        updatedAt: product.updated_at,
      },
      stock: {
        physical: Number(level?.physical_stock ?? 0),
        safety: Number(level?.safety_stock ?? 0),
      },
      supplier: supplier
        ? { id: supplier.id, name: supplier.name, type: supplier.type, phone: supplier.phone || null, leadTimeDays: supplier.leadTimeDays }
        : null,
      restock,
      orders,
    });
  } catch (error: any) {
    console.error('Error en GET /api/products/[id]:', error);
    return NextResponse.json({ error: 'Error interno al cargar el producto.' }, { status: 500 });
  }
}

/**
 * PUT /api/products/[id|sku]
 * Edita datos del producto y su nivel de stock. Validaciones estrictas.
 */
export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireWorkspace();
    if (auth.error) return auth.error;
    const { id } = await context.params;
    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();

    const product = await findProduct(supabase, decodeURIComponent(id));
    if (!product) {
      return NextResponse.json({ error: 'Producto no encontrado.' }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) return NextResponse.json({ error: 'El nombre es obligatorio.' }, { status: 400 });
      if (name.length > 200) return NextResponse.json({ error: 'El nombre no puede superar 200 caracteres.' }, { status: 400 });
      updates.name = name;
    }
    if (body.price !== undefined) {
      const price = Number(body.price);
      if (!Number.isFinite(price) || price < 0) {
        return NextResponse.json({ error: 'El precio debe ser un número mayor o igual a 0.' }, { status: 400 });
      }
      updates.unit_price = price;
    }
    if (body.cost !== undefined) {
      const cost = Number(body.cost);
      if (!Number.isFinite(cost) || cost < 0) {
        return NextResponse.json({ error: 'El costo debe ser un número mayor o igual a 0.' }, { status: 400 });
      }
      updates.unit_cost = cost;
    }
    if (body.status !== undefined) {
      if (body.status !== 'active' && body.status !== 'paused') {
        return NextResponse.json({ error: 'Estado inválido (active o paused).' }, { status: 400 });
      }
      updates.status = body.status;
    }
    if (body.categoryId !== undefined) {
      if (body.categoryId === null || body.categoryId === '') {
        updates.category_id = null;
      } else {
        const { data: cat } = await supabase.from('categories').select('id').eq('id', body.categoryId).maybeSingle();
        if (!cat) return NextResponse.json({ error: 'La categoría indicada no existe.' }, { status: 400 });
        updates.category_id = body.categoryId;
      }
    }
    if (Object.keys(updates).length > 0) {
      updates.updated_at = new Date().toISOString();
      const { error } = await supabase.from('products').update(updates).eq('id', product.id);
      if (error) {
        console.error('Error al actualizar producto:', error);
        return NextResponse.json({ error: 'No se pudo actualizar el producto.' }, { status: 500 });
      }
    }

    if (body.stock !== undefined || body.safetyStock !== undefined) {
      const current = await supabase
        .from('inventory_levels')
        .select('physical_stock,safety_stock')
        .eq('product_id', product.id)
        .maybeSingle();
      const stock =
        body.stock === undefined ? Number(current.data?.physical_stock ?? 0) : Math.floor(Number(body.stock));
      const safety =
        body.safetyStock === undefined ? Number(current.data?.safety_stock ?? 0) : Math.floor(Number(body.safetyStock));
      if (!Number.isInteger(stock) || stock < 0 || !Number.isInteger(safety) || safety < 0) {
        return NextResponse.json({ error: 'El stock debe ser un entero mayor o igual a 0.' }, { status: 400 });
      }
      if (current.data) {
        await supabase
          .from('inventory_levels')
          .update({ physical_stock: stock, safety_stock: safety })
          .eq('product_id', product.id);
      } else {
        await supabase.from('inventory_levels').insert({
          id: `inv-${Date.now().toString(36)}`,
          product_id: product.id,
          physical_stock: stock,
          safety_stock: safety,
        });
      }
    }

    return NextResponse.json({ success: true, message: 'Producto actualizado correctamente.' });
  } catch (error: any) {
    console.error('Error en PUT /api/products/[id]:', error);
    return NextResponse.json({ error: 'Error interno al actualizar el producto.' }, { status: 500 });
  }
}
