'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import {
  Tag,
  Search,
  SlidersHorizontal,
  Plus,
  Zap,
  Image as ImageIcon,
  ChevronUp,
  ChevronDown,
  X,
  Loader2,
} from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { useSearchQuery } from '@/hooks/useSearchQuery';
import { triggerNotificationRefresh } from '@/context/NotificationContext';
import { AppShell } from '@/components/layout/AppShell';

interface ProductItem {
  id: string;
  sku: string;
  name: string;
  price: number;
  cost: number;
  status: string;
  categoryId: string | null;
  category: string | null;
  subcategory: string | null;
}

interface Kpis {
  total: number;
  categories: number;
  avgPrice: number;
  active: number;
}

const PAGE_SIZE = 10;

function formatPEN(n: number): string {
  return `PEN ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function ProductsPage() {
  return (
    <AppShell>
      <Suspense fallback={null}>
        <ProductsIndex />
      </Suspense>
    </AppShell>
  );
}

function ProductsIndex() {
  const router = useRouter();
  const initialQ = useSearchQuery();
  const [items, setItems] = useState<ProductItem[]>([]);
  const [kpis, setKpis] = useState<Kpis>({ total: 0, categories: 0, avgPrice: 0, active: 0 });
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [planLimit, setPlanLimit] = useState(500);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState(initialQ);
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  // Sincronizar con ?q= (navegación desde categorías / buscador)
  useEffect(() => {
    setQuery(initialQ);
  }, [initialQ]);

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);

  const [fSku, setFSku] = useState('');
  const [fName, setFName] = useState('');
  const [fPrice, setFPrice] = useState('');
  const [fCost, setFCost] = useState('');
  const [fCategoryId, setFCategoryId] = useState('');
  const [fNewCategory, setFNewCategory] = useState('');
  const [fStock, setFStock] = useState('0');
  const [fSafety, setFSafety] = useState('0');

  const debouncedQuery = useDebounce(query, 300);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const atCap = kpis.total >= planLimit;

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        q: debouncedQuery.trim(),
        category,
        status,
        sort: 'referencia',
        order: sortOrder,
        page: String(page),
        pageSize: String(PAGE_SIZE),
      });
      const res = await fetch(`/api/products?${params.toString()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        setTotal(data.total || 0);
        setKpis(data.kpis || { total: 0, categories: 0, avgPrice: 0, active: 0 });
        if (data.categories) setCategories(data.categories);
        if (data.planLimit) setPlanLimit(data.planLimit);
        setSelected((prev) => prev.filter((sku) => (data.items || []).some((i: ProductItem) => i.sku === sku)));
      }
    } catch (err) {
      console.error('Error al cargar productos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, category, status, sortOrder, page]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, category, status]);

  const allSelected = items.length > 0 && items.every((i) => selected.includes(i.sku));

  const toggleSelect = (sku: string) => {
    setSelected((prev) => (prev.includes(sku) ? prev.filter((s) => s !== sku) : [...prev, sku]));
  };

  const toggleSelectAll = () => {
    setSelected(allSelected ? [] : items.map((i) => i.sku));
  };

  const handleBulkOC = async () => {
    if (selected.length === 0 || bulkLoading) return;
    setBulkLoading(true);
    setBanner(null);
    try {
      const res = await fetch('/api/dashboard/reabastecimiento/oc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds: selected }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setBanner({ type: 'success', text: data.summary || `Se procesaron ${data.count} órdenes.` });
        setSelected([]);
        triggerNotificationRefresh();
      } else {
        setBanner({ type: 'error', text: data.error || 'No se pudieron generar las órdenes.' });
      }
    } catch (err: any) {
      setBanner({ type: 'error', text: `Error de conexión: ${err.message}` });
    } finally {
      setBulkLoading(false);
    }
  };

  const resetForm = () => {
    setFSku('');
    setFName('');
    setFPrice('');
    setFCost('');
    setFCategoryId('');
    setFNewCategory('');
    setFStock('0');
    setFSafety('0');
    setFormError(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: fSku,
          name: fName,
          price: fPrice === '' ? NaN : Number(fPrice),
          cost: fCost === '' ? 0 : Number(fCost),
          categoryId: fCategoryId || undefined,
          categoryName: fCategoryId ? undefined : fNewCategory || undefined,
          stock: fStock === '' ? 0 : Number(fStock),
          safetyStock: fSafety === '' ? 0 : Number(fSafety),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'No se pudo crear el producto.');
      }
      setShowModal(false);
      resetForm();
      setBanner({ type: 'success', text: `Producto ${data.item?.sku || ''} creado correctamente.` });
      fetchProducts();
    } catch (err: any) {
      setFormError(err?.message || 'No se pudo crear el producto.');
    } finally {
      setSaving(false);
    }
  };

  const kpiCards = useMemo(
    () => [
      { label: 'PRODUCTOS TOTALES', value: String(kpis.total), caption: 'Productos en el catálogo' },
      { label: 'CATEGORÍAS', value: String(kpis.categories), caption: 'Categorías de productos' },
      { label: 'PRECIO MEDIO', value: formatPEN(kpis.avgPrice), caption: 'precio medio de venta' },
      { label: 'PRODUCTOS ACTIVOS', value: String(kpis.active), caption: 'Actualmente activo' },
    ],
    [kpis]
  );

  const hasFilters = debouncedQuery.trim() !== '' || category !== 'all' || status !== 'all';
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(total, page * PAGE_SIZE);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Header */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px 22px', display: 'flex', alignItems: 'center', gap: '14px' }}>
        <span
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            background: '#f1f5f9',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#475569',
            flexShrink: 0,
          }}
        >
          <Tag size={20} />
        </span>
        <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: 0 }}>Productos</h1>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '13px', color: '#64748b' }}>
          Descripción General del Catálogo de Productos ({kpis.total} producto{kpis.total === 1 ? '' : 's'})
        </span>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 600,
            background: '#f1f5f9',
            border: '1px solid #e2e8f0',
            color: '#475569',
            padding: '3px 10px',
            borderRadius: '999px',
          }}
        >
          Productos: {kpis.total} / {planLimit} (Light)
        </span>
      </div>

      {/* KPIs */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          overflow: 'hidden',
        }}
      >
        {kpiCards.map((k, idx) => (
          <div key={k.label} style={{ padding: '18px 20px', borderLeft: idx === 0 ? 'none' : '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', color: '#475569' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#2563eb' }} />
              {k.label}
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginTop: '6px', fontVariantNumeric: 'tabular-nums' }}>
              {k.value}
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>{k.caption}</div>
          </div>
        ))}
      </div>

      {/* Banner */}
      {banner && (
        <div
          role={banner.type === 'error' ? 'alert' : 'status'}
          style={{
            background: banner.type === 'success' ? '#f0fdf4' : '#fef2f2',
            border: banner.type === 'success' ? '1px solid #bbf7d0' : '1px solid #fecaca',
            color: banner.type === 'success' ? '#166534' : '#991b1b',
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span style={{ flex: 1 }}>{banner.text}</span>
          <button
            type="button"
            onClick={() => setBanner(null)}
            aria-label="Cerrar aviso"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 700 }}
          >
            ×
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre, referencia o categoría..."
            aria-label="Buscar productos"
            style={{
              width: '100%',
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              borderRadius: '8px',
              padding: '9px 36px 9px 12px',
              fontSize: '13px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <Search size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
        </div>
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            aria-label="Filtros"
            aria-expanded={showFilters}
            style={{
              border: '1px solid #e2e8f0',
              background: category !== 'all' || status !== 'all' ? '#eff6ff' : '#ffffff',
              borderColor: category !== 'all' || status !== 'all' ? '#bfdbfe' : '#e2e8f0',
              borderRadius: '8px',
              padding: '9px 12px',
              cursor: 'pointer',
              color: '#475569',
              display: 'flex',
            }}
          >
            <SlidersHorizontal size={16} />
          </button>
          {showFilters && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: 'calc(100% + 6px)',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                boxShadow: '0 12px 32px -8px rgba(15,23,42,0.18)',
                padding: '12px',
                zIndex: 50,
                minWidth: '220px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>
                CATEGORÍA
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{ display: 'block', width: '100%', marginTop: '4px', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                >
                  <option value="all">Todas</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>
                ESTADO
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  style={{ display: 'block', width: '100%', marginTop: '4px', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                >
                  <option value="all">Todos</option>
                  <option value="active">Activos</option>
                  <option value="paused">Pausados</option>
                </select>
              </label>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          disabled={atCap}
          title={atCap ? `Límite del plan Light alcanzado (${planLimit} productos)` : 'Crear un nuevo producto'}
          style={{
            marginLeft: 'auto',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: atCap ? '#93c5fd' : '#2563eb',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            padding: '9px 16px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: atCap ? 'not-allowed' : 'pointer',
          }}
        >
          <Plus size={15} /> Nuevo Producto
        </button>
      </div>

      {/* Barra de selección */}
      {selected.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '8px',
            padding: '9px 14px',
            fontSize: '13px',
            fontWeight: 600,
            color: '#1d4ed8',
          }}
        >
          <span>{selected.length} seleccionado{selected.length === 1 ? '' : 's'}</span>
          <button
            type="button"
            onClick={handleBulkOC}
            disabled={bulkLoading}
            style={{
              background: '#0f172a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              padding: '7px 12px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: bulkLoading ? 'not-allowed' : 'pointer',
            }}
          >
            {bulkLoading ? 'Generando…' : `Generar OC (${selected.length})`}
          </button>
          <button
            type="button"
            onClick={() => setSelected([])}
            style={{ background: 'transparent', border: 'none', color: '#1d4ed8', fontSize: '12px', fontWeight: 600, cursor: 'pointer', marginLeft: 'auto' }}
          >
            Limpiar
          </button>
        </div>
      )}

      {/* Tabla */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
              <th style={{ padding: '12px 12px 12px 18px', width: '36px' }}>
                <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} aria-label="Seleccionar todos" style={{ accentColor: '#2563eb', width: '15px', height: '15px', cursor: 'pointer' }} />
              </th>
              <th style={{ padding: '12px' }}>
                <button
                  type="button"
                  onClick={() => setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: '#475569', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: 0 }}
                >
                  REFERENCIA {sortOrder === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>
              </th>
              <th style={{ padding: '12px', width: '40px', color: '#94a3b8' }}>
                <ImageIcon size={15} />
              </th>
              <th style={{ padding: '12px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: '#475569' }}>NOMBRE</th>
              <th style={{ padding: '12px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: '#475569' }}>PRECIO</th>
              <th style={{ padding: '12px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: '#475569' }}>CATEGORÍA</th>
              <th style={{ padding: '12px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: '#475569' }}>SUBCATEGORÍA</th>
              <th style={{ padding: '12px 18px 12px 12px', textAlign: 'right', color: '#2563eb' }}>
                <Zap size={15} />
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                  Cargando catálogo…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: 0 }}>
                  <div style={{ margin: '12px', border: '1px solid #e2e8f0', borderLeft: '3px solid #2563eb', borderRadius: '8px', background: '#f8fafc', padding: '14px 16px', fontSize: '13px', color: '#0f172a' }}>
                    {total === 0 && !hasFilters
                      ? 'No hay productos para mostrar. Añade un nuevo producto haciendo clic en NUEVO PRODUCTO arriba.'
                      : 'Sin coincidencias para los filtros aplicados.'}
                  </div>
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 12px 12px 18px' }}>
                    <input
                      type="checkbox"
                      checked={selected.includes(item.sku)}
                      onChange={() => toggleSelect(item.sku)}
                      aria-label={`Seleccionar ${item.sku}`}
                      style={{ accentColor: '#2563eb', width: '15px', height: '15px', cursor: 'pointer' }}
                    />
                  </td>
                  <td style={{ padding: '12px', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>{item.sku}</td>
                  <td style={{ padding: '12px' }}>
                    <span
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: '#f1f5f9',
                        border: '1px solid #e2e8f0',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#94a3b8',
                      }}
                    >
                      <ImageIcon size={15} />
                    </span>
                  </td>
                  <td style={{ padding: '12px', color: '#0f172a' }}>
                    <button
                      type="button"
                      onClick={() => router.push(`/products/${item.id}`)}
                      title={`Abrir ficha de ${item.sku}`}
                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#1d4ed8', fontWeight: 600, fontSize: '13px', textAlign: 'left' }}
                    >
                      {item.name}
                    </button>
                  </td>
                  <td style={{ padding: '12px', fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                    {formatPEN(item.price)}
                  </td>
                  <td style={{ padding: '12px', color: '#475569' }}>{item.category || '—'}</td>
                  <td style={{ padding: '12px', color: '#94a3b8' }}>{item.subcategory || '—'}</td>
                  <td style={{ padding: '12px 18px 12px 12px', textAlign: 'right' }}>
                    <button
                      type="button"
                      title={`Ver ${item.sku} en inventario`}
                      onClick={() => router.push(`/inventory/inventory-items?q=${encodeURIComponent(item.sku)}`)}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#2563eb', display: 'inline-flex' }}
                    >
                      <Zap size={15} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {/* Paginación */}
        {!loading && total > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 18px', borderTop: '1px solid #e2e8f0', fontSize: '12px', color: '#64748b' }}>
            <span>
              Mostrando {from}–{to} de {total}
            </span>
            <span style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                style={{ border: '1px solid #e2e8f0', background: '#ffffff', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', fontWeight: 600, cursor: page <= 1 ? 'not-allowed' : 'pointer', color: page <= 1 ? '#cbd5e1' : '#334155' }}
              >
                Anterior
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                style={{ border: '1px solid #e2e8f0', background: '#ffffff', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', fontWeight: 600, cursor: page >= totalPages ? 'not-allowed' : 'pointer', color: page >= totalPages ? '#cbd5e1' : '#334155' }}
              >
                Siguiente
              </button>
            </span>
          </div>
        )}
      </div>

      {/* Modal Nuevo Producto */}
      {showModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Nuevo producto"
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 80, padding: '16px' }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !saving) setShowModal(false);
          }}
        >
          <form
            onSubmit={handleCreate}
            style={{ background: '#ffffff', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', margin: 0, flex: 1 }}>Nuevo Producto</h2>
              <button
                type="button"
                onClick={() => !saving && setShowModal(false)}
                aria-label="Cerrar"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex' }}
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div role="alert" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '10px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 600 }}>
                {formError}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                Referencia (SKU) *
                <input value={fSku} onChange={(e) => setFSku(e.target.value)} placeholder="SKU-XXX-000" required
                  style={inputStyle} />
              </label>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                Precio venta (PEN) *
                <input value={fPrice} onChange={(e) => setFPrice(e.target.value)} placeholder="0.00" inputMode="decimal" required
                  style={inputStyle} />
              </label>
            </div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
              Nombre *
              <input value={fName} onChange={(e) => setFName(e.target.value)} placeholder="Nombre del producto" required
                style={inputStyle} />
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                Categoría
                <select value={fCategoryId} onChange={(e) => setFCategoryId(e.target.value)} style={inputStyle}>
                  <option value="">Seleccionar…</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                Nueva categoría
                <input value={fNewCategory} onChange={(e) => setFNewCategory(e.target.value)} placeholder="O crea una nueva" disabled={!!fCategoryId}
                  style={inputStyle} />
              </label>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                Costo (PEN)
                <input value={fCost} onChange={(e) => setFCost(e.target.value)} placeholder="0.00" inputMode="decimal"
                  style={inputStyle} />
              </label>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                Stock inicial
                <input value={fStock} onChange={(e) => setFStock(e.target.value)} placeholder="0" inputMode="numeric"
                  style={inputStyle} />
              </label>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                Stock seguridad
                <input value={fSafety} onChange={(e) => setFSafety(e.target.value)} placeholder="0" inputMode="numeric"
                  style={inputStyle} />
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
              <button
                type="button"
                onClick={() => !saving && setShowModal(false)}
                style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '9px 16px', fontSize: '13px', fontWeight: 600, color: '#475569', cursor: saving ? 'not-allowed' : 'pointer' }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: saving ? '#93c5fd' : '#2563eb', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '9px 16px', fontSize: '13px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}
              >
                {saving && <Loader2 size={15} style={{ animation: 'inventa-spin 1s linear infinite' }} />}
                {saving ? 'Guardando…' : 'Crear producto'}
              </button>
            </div>
          </form>
        </div>
      )}
      <style>{`@keyframes inventa-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  marginTop: '4px',
  padding: '9px 12px',
  borderRadius: '8px',
  border: '1px solid #cbd5e1',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
  fontWeight: 400,
};
