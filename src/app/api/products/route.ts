import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const PLAN_LIMIT = 500;
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

function cleanPattern(q: string): string {
  return q.replace(/[,()]/g, '');
}

/**
 * GET /api/products?q=&category=&status=&page=&pageSize=&sort=&order=
 * Catálogo real desde Supabase (products + categories), con KPIs calculados
 * sobre el conjunto filtrado: total, categorías únicas, precio medio y activos.
 */
export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const q = params.get('q')?.trim().replace(/\s+/g, ' ') || '';
    const category = params.get('category') || 'all';
    const status = params.get('status') || 'all';
    const page = Math.max(1, Number(params.get('page')) || 1);
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(params.get('pageSize')) || DEFAULT_PAGE_SIZE));
    const sort = params.get('sort') === 'nombre' || params.get('sort') === 'precio' ? params.get('sort') : 'referencia';
    const order = params.get('order') === 'desc' ? 'desc' : 'asc';

    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();

    const { data: categories } = await supabase.from('categories').select('id,name');
    const catById = new Map((categories || []).map((c: any) => [c.id, c.name]));
    const catByName = new Map((categories || []).map((c: any) => [c.name.toLowerCase(), c.id]));

    // Filtro por categoría: id directo o nombre (DB-side)
    let categoryIds: string[] | null = null;
    if (category !== 'all') {
      const byId = catById.has(category) ? [category] : [];
      const byName = [...catByName.entries()]
        .filter(([name]) => name.includes(category.toLowerCase()))
        .map(([, id]) => id);
      categoryIds = [...new Set([...byId, ...byName])];
      if (categoryIds.length === 0) {
        return NextResponse.json({
          success: true,
          items: [],
          total: 0,
          page,
          pageSize,
          kpis: { total: 0, categories: 0, avgPrice: 0, active: 0 },
          planLimit: PLAN_LIMIT,
        });
      }
    }

    const buildQuery = () => {
      let query = supabase.from('products').select('id,sku_code,name,unit_cost,unit_price,status,category_id,updated_at');
      if (q) {
        const pattern = `%${cleanPattern(q)}%`;
        query = query.or(`name.ilike.${pattern},sku_code.ilike.${pattern}`);
      }
      if (categoryIds) query = query.in('category_id', categoryIds);
      if (status === 'active' || status === 'paused') query = query.eq('status', status);
      return query;
    };

    // KPIs sobre el conjunto filtrado completo (sin paginar)
    const { data: allRows, error: allError } = await buildQuery();
    if (allError) throw new Error(allError.message);
    const rows = allRows || [];
    const prices = rows.map((r: any) => Number(r.unit_price) || 0);
    const kpis = {
      total: rows.length,
      categories: new Set(rows.map((r: any) => r.category_id).filter(Boolean)).size,
      avgPrice: prices.length > 0 ? Number((prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2)) : 0,
      active: rows.filter((r: any) => r.status === 'active').length,
    };

    // Página ordenada
    const sortCol = sort === 'nombre' ? 'name' : sort === 'precio' ? 'unit_price' : 'sku_code';
    const { data: pageRows, error: pageError } = await buildQuery()
      .order(sortCol, { ascending: order === 'asc' })
      .range((page - 1) * pageSize, page * pageSize - 1);
    if (pageError) throw new Error(pageError.message);

    const items = (pageRows || []).map((r: any) => ({
      id: r.id,
      sku: r.sku_code,
      name: r.name,
      price: Number(r.unit_price) || 0,
      cost: Number(r.unit_cost) || 0,
      status: r.status,
      categoryId: r.category_id,
      category: catById.get(r.category_id) || null,
      subcategory: null,
    }));

    return NextResponse.json({
      success: true,
      items,
      total: rows.length,
      page,
      pageSize,
      kpis,
      planLimit: PLAN_LIMIT,
      categories: (categories || []).map((c: any) => ({ id: c.id, name: c.name })),
    });
  } catch (error: any) {
    console.error('Error en GET /api/products:', error);
    return NextResponse.json({ error: 'Error interno al listar productos.' }, { status: 500 });
  }
}

/**
 * POST /api/products
 * Crea un producto real (products + inventory_levels). 409 si el SKU existe.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const sku = typeof body?.sku === 'string' ? body.sku.trim() : '';
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const price = Number(body?.price);
    const cost = body?.cost === undefined || body?.cost === null || body?.cost === '' ? 0 : Number(body?.cost);
    const stock = body?.stock === undefined || body?.stock === null || body?.stock === '' ? 0 : Math.floor(Number(body?.stock));
    const safetyStock =
      body?.safetyStock === undefined || body?.safetyStock === null || body?.safetyStock === ''
        ? 0
        : Math.floor(Number(body?.safetyStock));

    if (!sku) return NextResponse.json({ error: 'La referencia (SKU) es obligatoria.' }, { status: 400 });
    if (!name) return NextResponse.json({ error: 'El nombre es obligatorio.' }, { status: 400 });
    if (!Number.isFinite(price) || price < 0) {
      return NextResponse.json({ error: 'El precio debe ser un número mayor o igual a 0.' }, { status: 400 });
    }
    if (!Number.isFinite(cost) || cost < 0) {
      return NextResponse.json({ error: 'El costo debe ser un número mayor o igual a 0.' }, { status: 400 });
    }
    if (!Number.isInteger(stock) || stock < 0 || !Number.isInteger(safetyStock) || safetyStock < 0) {
      return NextResponse.json({ error: 'El stock debe ser un entero mayor o igual a 0.' }, { status: 400 });
    }

    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();

    // Categoría: id existente o nombre nuevo (se crea)
    let categoryId: string | null = typeof body?.categoryId === 'string' && body.categoryId ? body.categoryId : null;
    const categoryName = typeof body?.categoryName === 'string' ? body.categoryName.trim() : '';
    if (!categoryId && categoryName) {
      const { data: existing } = await supabase
        .from('categories')
        .select('id')
        .ilike('name', categoryName)
        .maybeSingle();
      if (existing?.id) {
        categoryId = existing.id;
      } else {
        const { data: created, error: catError } = await supabase
          .from('categories')
          .insert({ id: `cat-${Date.now().toString(36)}`, name: categoryName })
          .select('id')
          .single();
        if (catError || !created) {
          return NextResponse.json({ error: 'No se pudo crear la categoría.' }, { status: 500 });
        }
        categoryId = created.id;
      }
    }
    if (categoryId) {
      const { data: catExists } = await supabase.from('categories').select('id').eq('id', categoryId).maybeSingle();
      if (!catExists) {
        return NextResponse.json({ error: 'La categoría indicada no existe.' }, { status: 400 });
      }
    }

    const { data: dup } = await supabase.from('products').select('id').eq('sku_code', sku).maybeSingle();
    if (dup) {
      return NextResponse.json({ error: `Ya existe un producto con la referencia ${sku}.` }, { status: 409 });
    }

    const id = `prd-${Date.now().toString(36)}`;
    const { data: inserted, error: insertError } = await supabase
      .from('products')
      .insert({
        id,
        sku_code: sku,
        name,
        category_id: categoryId,
        unit_cost: cost,
        unit_price: price,
        status: 'active',
      })
      .select('id,sku_code,name,unit_cost,unit_price,status,category_id')
      .single();

    if (insertError || !inserted) {
      const msg = String(insertError?.message || '');
      if (insertError?.code === '23505' || /duplicate|unique/i.test(msg)) {
        return NextResponse.json({ error: `Ya existe un producto con la referencia ${sku}.` }, { status: 409 });
      }
      console.error('Error al crear producto:', insertError);
      return NextResponse.json({ error: 'No se pudo crear el producto.' }, { status: 500 });
    }

    await supabase.from('inventory_levels').insert({
      id: `inv-${Date.now().toString(36)}`,
      product_id: id,
      physical_stock: stock,
      safety_stock: safetyStock,
    });

    return NextResponse.json({ success: true, item: inserted }, { status: 201 });
  } catch (error: any) {
    console.error('Error en POST /api/products:', error);
    return NextResponse.json({ error: 'Error interno al crear el producto.' }, { status: 500 });
  }
}
