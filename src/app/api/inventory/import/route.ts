import { NextRequest, NextResponse } from 'next/server';
import { resolveWorkspaceId } from '@/lib/locationsStore';
import { parseCSV } from '@/lib/csv';

export const dynamic = 'force-dynamic';

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_ROWS = 1000;

function findColumn(headers: string[], names: string[]): number {
  const lower = headers.map((h) => h.toLowerCase());
  for (const n of names) {
    const idx = lower.indexOf(n);
    if (idx !== -1) return idx;
  }
  return -1;
}

function parseImportDate(raw: string): { ok: boolean; iso?: string } {
  const v = raw.trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (m) {
    const d = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00`);
    if (!Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === `${m[1]}-${m[2]}-${m[3]}`) {
      return { ok: true, iso: `${m[1]}-${m[2]}-${m[3]}` };
    }
    return { ok: false };
  }
  m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v);
  if (m) {
    const d = new Date(`${m[3]}-${m[2]}-${m[1]}T00:00:00`);
    if (!Number.isNaN(d.getTime())) {
      return { ok: true, iso: `${m[3]}-${m[2]}-${m[1]}` };
    }
  }
  return { ok: false };
}

export interface ImportRowError {
  row: number;
  message: string;
}

/**
 * POST /api/inventory/import (FormData: file, locationRef, mode=stock|ventas)
 * Stock: columnas ProductId o ProductSKU + Quantity → fija stock absoluto.
 * Ventas: + Date (YYYY-MM-DD o DD/MM/YYYY) y Type opcional (VENTA|DEVOLUCION)
 *   → VENTA resta stock, DEVOLUCION suma.
 * Valida TODO antes de escribir: si hay errores → 422 sin tocar la BD.
 */
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData().catch(() => null);
    const file = form?.get('file');
    const mode = form?.get('mode') === 'ventas' ? 'ventas' : 'stock';
    const locationRef =
      typeof form?.get('locationRef') === 'string'
        ? String(form.get('locationRef')).trim().slice(0, 20).toUpperCase()
        : '';

    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: 'Adjunta un archivo CSV (campo file).' }, { status: 400 });
    }
    const fileName = (file as any).name || 'archivo.csv';
    if (!/\.csv$/i.test(fileName) && file.type !== 'text/csv') {
      return NextResponse.json({ error: 'Formato no válido: solo archivos .csv.' }, { status: 400 });
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: 'El archivo supera el máximo de 5 MB.' }, { status: 400 });
    }
    if (!locationRef) {
      return NextResponse.json({ error: 'Selecciona la ubicación destino.' }, { status: 400 });
    }

    const text = await file.text();
    const { headers, rows } = parseCSV(text);

    if (headers.length === 0) {
      return NextResponse.json({ error: 'El archivo está vacío.' }, { status: 422 });
    }
    if (rows.length === 0) {
      return NextResponse.json({ error: 'El archivo no contiene filas de datos.' }, { status: 422 });
    }
    if (rows.length > MAX_ROWS) {
      return NextResponse.json({ error: `Máximo ${MAX_ROWS} filas por importación.` }, { status: 422 });
    }

    const idCol = findColumn(headers, ['productid', 'id', 'product_id']);
    const skuCol = findColumn(headers, ['productsku', 'sku', 'reference', 'referencia']);
    const qtyCol = findColumn(headers, ['quantity', 'qty', 'cantidad', 'cantidad', 'stock']);
    const dateCol = findColumn(headers, ['date', 'fecha']);
    const typeCol = findColumn(headers, ['type', 'tipo']);

    if (idCol === -1 && skuCol === -1) {
      return NextResponse.json({ error: 'Falta la columna ProductId o ProductSKU.' }, { status: 422 });
    }
    if (qtyCol === -1) {
      return NextResponse.json({ error: 'Falta la columna Quantity.' }, { status: 422 });
    }
    if (mode === 'ventas' && dateCol === -1) {
      return NextResponse.json({ error: 'El modo ventas exige la columna Date (YYYY-MM-DD o DD/MM/YYYY).' }, { status: 422 });
    }

    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();

    const { data: products } = await supabase.from('products').select('id,sku_code,name');
    const byId = new Map((products || []).map((p: any) => [p.id, p]));
    const bySku = new Map((products || []).map((p: any) => [String(p.sku_code).toUpperCase(), p]));

    interface ValidRow {
      row: number;
      product: any;
      qty: number;
      date?: string;
      kind?: 'venta' | 'devolucion';
    }
    const valid: ValidRow[] = [];
    const errors: ImportRowError[] = [];

    rows.forEach((cells, idx) => {
      const rowNum = idx + 2; // +1 cabecera, +1 base-1
      const get = (col: number) => (col === -1 ? '' : (cells[col] || '').trim());

      const idVal = get(idCol);
      const skuVal = get(skuCol);
      const product = (idVal && byId.get(idVal)) || bySku.get(skuVal.toUpperCase());

      if (!idVal && !skuVal) {
        errors.push({ row: rowNum, message: 'Sin ProductId ni ProductSKU.' });
        return;
      }
      if (!product) {
        errors.push({ row: rowNum, message: `Producto no encontrado: ${skuVal || idVal}.` });
        return;
      }
      const qtyRaw = get(qtyCol);
      if (!/^-?\d+$/.test(qtyRaw)) {
        errors.push({ row: rowNum, message: `Cantidad inválida: "${qtyRaw}".` });
        return;
      }
      const qty = Number(qtyRaw);

      if (mode === 'stock') {
        if (qty < 0) {
          errors.push({ row: rowNum, message: 'En stock inicial la cantidad no puede ser negativa.' });
          return;
        }
        valid.push({ row: rowNum, product, qty });
      } else {
        const parsed = parseImportDate(get(dateCol));
        if (!parsed.ok) {
          errors.push({ row: rowNum, message: `Fecha inválida: "${get(dateCol)}" (usa YYYY-MM-DD o DD/MM/YYYY).` });
          return;
        }
        if (qty <= 0) {
          errors.push({ row: rowNum, message: 'En ventas la cantidad debe ser mayor a cero.' });
          return;
        }
        const kindRaw = typeCol === -1 ? 'VENTA' : get(typeCol).toUpperCase();
        if (kindRaw && kindRaw !== 'VENTA' && kindRaw !== 'DEVOLUCION') {
          errors.push({ row: rowNum, message: `Tipo inválido: "${get(typeCol)}" (VENTA o DEVOLUCION).` });
          return;
        }
        valid.push({ row: rowNum, product, qty, date: parsed.iso, kind: kindRaw === 'DEVOLUCION' ? 'devolucion' : 'venta' });
      }
    });

    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, error: `El archivo tiene ${errors.length} error(es). No se escribió nada.`, errors, applied: 0 },
        { status: 422 }
      );
    }

    // Aplicar: stock suma/resta, placement a la ubicación elegida
    const { data: ws } = await supabase.from('workspaces').select('id,settings').limit(1).maybeSingle();
    const workspaceId = ws?.id as string | undefined;
    const settings = { ...(((ws?.settings as any) || {})) };
    const placement = { ...(settings.inventoryPlacement || {}) };

    let applied = 0;
    const appliedRows: Array<{ sku: string; qty: number; prev: number; next: number }> = [];

    for (const v of valid) {
      const { data: level } = await supabase
        .from('inventory_levels')
        .select('physical_stock,safety_stock')
        .eq('product_id', v.product.id)
        .maybeSingle();
      const current = Number(level?.physical_stock ?? 0);
      let next: number;
      if (mode === 'stock') {
        next = v.qty;
      } else {
        next = v.kind === 'venta' ? current - v.qty : current + v.qty;
        if (next < 0) {
          return NextResponse.json(
            {
              success: false,
              error: `Stock insuficiente en fila ${v.row} (${v.product.sku_code}): hay ${current} u. No se escribió nada.`,
              errors: [{ row: v.row, message: 'Stock insuficiente.' }],
              applied: 0,
            },
            { status: 422 }
          );
        }
      }
      if (level) {
        const { error } = await supabase
          .from('inventory_levels')
          .update({ physical_stock: next })
          .eq('product_id', v.product.id);
        if (error) {
          return NextResponse.json({ success: false, error: `Error escribiendo ${v.product.sku_code}. No se escribió nada más.`, applied }, { status: 500 });
        }
      } else {
        const { error } = await supabase.from('inventory_levels').insert({
          id: `inv-${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`,
          product_id: v.product.id,
          physical_stock: next,
          safety_stock: 0,
        });
        if (error) {
          return NextResponse.json({ success: false, error: `Error escribiendo ${v.product.sku_code}.`, applied }, { status: 500 });
        }
      }
      placement[v.product.id] = { branch: 'Sede Lima Central', locationRef };
      applied++;
      appliedRows.push({ sku: v.product.sku_code, qty: v.qty, prev: current, next });
    }

    if (workspaceId) {
      settings.inventoryPlacement = placement;
      await supabase.from('workspaces').update({ settings }).eq('id', workspaceId);
    }

    return NextResponse.json({
      success: true,
      message: `Importación completa: ${applied} filas aplicadas en ${locationRef}.`,
      applied,
      rows: appliedRows,
      errors: [],
    });
  } catch (error: any) {
    console.error('Error en POST /api/inventory/import:', error);
    return NextResponse.json({ error: 'Error interno al procesar el archivo.' }, { status: 500 });
  }
}
