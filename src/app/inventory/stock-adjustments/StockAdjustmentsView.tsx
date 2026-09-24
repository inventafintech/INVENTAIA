'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  RefreshCw,
  Search,
  SlidersHorizontal,
  Plus,
  Zap,
  X,
  Loader2,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';

interface AdjustmentItem {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  locationRef: string;
  date: string;
  type: 'correccion' | 'transferencia' | 'consumo';
  qtyDelta: number;
  reason: string;
  responsible: string;
  status: string;
}

const TYPE_META: Record<string, { label: string; color: string; bg: string }> = {
  correccion: { label: 'Corrección', color: '#b45309', bg: '#fffbeb' },
  transferencia: { label: 'Transferencia', color: '#1d4ed8', bg: '#eff6ff' },
  consumo: { label: 'Consumo', color: '#b91c1c', bg: '#fef2f2' },
};

const PAGE_SIZE = 10;

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function StockAdjustmentsView() {
  const router = useRouter();
  const [items, setItems] = useState<AdjustmentItem[]>([]);
  const [kpis, setKpis] = useState({ total: 0, correcciones: 0, transferencias: 0, consumos: 0 });
  const [integrations, setIntegrations] = useState<{ pending: boolean; missing: string[] }>({ pending: false, missing: [] });
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmBulk, setConfirmBulk] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [catalog, setCatalog] = useState<Array<{ id: string; sku: string; name: string; stock: number }>>([]);
  const [locations, setLocations] = useState<Array<{ ref: string; name: string }>>([]);
  const [fProductId, setFProductId] = useState('');
  const [fType, setFType] = useState<'correccion' | 'transferencia' | 'consumo'>('correccion');
  const [fQty, setFQty] = useState('');
  const [fToLocation, setFToLocation] = useState('LOC-00004');
  const [fReason, setFReason] = useState('');

  const debouncedQuery = useDebounce(query, 300);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const allSelected = items.length > 0 && items.every((i) => selected.includes(i.id));
  const currentStock = catalog.find((p) => p.id === fProductId)?.stock;

  const fetchAdjustments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        q: debouncedQuery.trim(),
        type,
        order: sortOrder,
        page: String(page),
        pageSize: String(PAGE_SIZE),
      });
      const res = await fetch(`/api/inventory/adjustments?${params.toString()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        setTotal(data.total || 0);
        setKpis(data.kpis || { total: 0, correcciones: 0, transferencias: 0, consumos: 0 });
        if (data.integrations) setIntegrations(data.integrations);
        setSelected((prev) => prev.filter((id) => (data.items || []).some((i: AdjustmentItem) => i.id === id)));
      }
    } catch (err) {
      console.error('Error al cargar ajustes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdjustments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, type, sortOrder, page]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, type]);

  useEffect(() => {
    if (selected.length === 0) setConfirmBulk(false);
  }, [selected]);

  const openCreate = async () => {
    setFormError(null);
    setFProductId('');
    setFType('correccion');
    setFQty('');
    setFToLocation('LOC-00004');
    setFReason('');
    try {
      const [prodRes, itemRes, locRes] = await Promise.all([
        fetch('/api/products?pageSize=100', { cache: 'no-store' }),
        fetch('/api/inventory/items?pageSize=100', { cache: 'no-store' }),
        fetch('/api/locations?pageSize=100', { cache: 'no-store' }),
      ]);
      const stockById = new Map<string, number>();
      if (itemRes.ok) {
        const ij = await itemRes.json();
        for (const it of ij.items || []) stockById.set(it.id, it.qty);
      }
      if (prodRes.ok) {
        const pj = await prodRes.json();
        setCatalog(
          (pj.items || []).map((p: any) => ({
            id: p.id,
            sku: p.sku,
            name: p.name,
            stock: stockById.get(p.id) ?? 0,
          }))
        );
      }
      if (locRes.ok) {
        const lj = await locRes.json();
        setLocations((lj.items || []).map((l: any) => ({ ref: l.ref, name: l.name })));
      }
    } catch {
      // el modal muestra el error al guardar si faltan datos
    }
    setShowModal(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      const res = await fetch('/api/inventory/adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: fProductId,
          type: fType,
          qty: fType === 'transferencia' ? 0 : fQty === '' ? NaN : Number(fQty),
          toLocationRef: fType === 'transferencia' ? fToLocation : undefined,
          reason: fReason,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'No se pudo registrar.');
      setShowModal(false);
      setBanner({ type: 'success', text: `Ajuste ${data.item?.id || ''} aplicado correctamente.` });
      fetchAdjustments();
    } catch (err: any) {
      setFormError(err?.message || 'No se pudo registrar.');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selected.length === 0) return;
    setBanner(null);
    try {
      const res = await fetch('/api/inventory/adjustments', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selected }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'No se pudo completar.');
      setSelected([]);
      setBanner({ type: 'success', text: data?.message || 'Historial depurado.' });
      fetchAdjustments();
    } catch (err: any) {
      setBanner({ type: 'error', text: err?.message || 'No se pudo completar.' });
    }
  };

  const kpiCards = [
    { label: 'AJUSTES TOTALES', value: String(kpis.total), caption: 'Todos los ajustes de stock.', color: '#2563eb' },
    { label: 'AJUSTES/CORRECCIONES', value: String(kpis.correcciones), caption: 'Correcciones y actualizaciones de stock', color: '#f97316' },
    { label: 'TRANSFERENCIAS DE STOCK', value: String(kpis.transferencias), caption: 'Transferencias de ubicación', color: '#1e3a8a' },
    { label: 'CONSUMOS', value: String(kpis.consumos), caption: 'Materiales consumidos', color: '#ef4444' },
  ];

  const hasFilters = debouncedQuery.trim() !== '' || type !== 'all';
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(total, page * PAGE_SIZE);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Header */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px 22px', display: 'flex', alignItems: 'center', gap: '14px' }}>
        <span style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#f1f5f9', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', flexShrink: 0 }}>
          <RefreshCw size={20} />
        </span>
        <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: 0 }}>Ajustes de stock</h1>
      </div>

      <span style={{ fontSize: '13px', color: '#64748b' }}>
        Gestión de ajustes de stock ({total} ajuste{total === 1 ? '' : 's'})
      </span>

      {integrations.pending && (
        <span style={{ alignSelf: 'flex-start', fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '999px', background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' }}>
          Pendiente de configuración: {integrations.missing.join(', ')}
        </span>
      )}

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
        {kpiCards.map((k, idx) => (
          <div key={k.label} style={{ padding: '18px 20px', borderLeft: idx === 0 ? 'none' : '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', color: '#475569' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: k.color }} />
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
          style={{ background: banner.type === 'success' ? '#f0fdf4' : '#fef2f2', border: banner.type === 'success' ? '1px solid #bbf7d0' : '1px solid #fecaca', color: banner.type === 'success' ? '#166534' : '#991b1b', padding: '12px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, display: 'flex', gap: '8px', alignItems: 'center' }}
        >
          <span style={{ flex: 1 }}>{banner.text}</span>
          <button type="button" onClick={() => setBanner(null)} aria-label="Cerrar aviso" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 700 }}>
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
            placeholder="Buscar por referencia, SKU, motivo o responsable..."
            aria-label="Buscar ajustes"
            style={{ width: '100%', border: '1px solid #e2e8f0', background: '#f8fafc', borderRadius: '8px', padding: '9px 36px 9px 12px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
          />
          <Search size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
        </div>
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            aria-label="Filtros"
            aria-expanded={showFilters}
            style={{ border: '1px solid #e2e8f0', background: type !== 'all' ? '#eff6ff' : '#ffffff', borderRadius: '8px', padding: '9px 12px', cursor: 'pointer', color: '#475569', display: 'flex', minHeight: '38px', alignItems: 'center' }}
          >
            <SlidersHorizontal size={16} />
          </button>
          {showFilters && (
            <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', boxShadow: '0 12px 32px -8px rgba(15,23,42,0.18)', padding: '12px', zIndex: 50, minWidth: '220px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>
                TIPO DE AJUSTE
                <select value={type} onChange={(e) => setType(e.target.value)} style={{ display: 'block', width: '100%', marginTop: '4px', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}>
                  <option value="all">Todos</option>
                  <option value="correccion">Corrección</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="consumo">Consumo</option>
                </select>
              </label>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={openCreate}
          style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '9px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', minHeight: '38px' }}
        >
          <Plus size={15} /> Nuevo Ajuste de stock
        </button>
      </div>

      {/* Selección */}
      {selected.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '9px 14px', fontSize: '13px', fontWeight: 600, color: '#1d4ed8' }}>
          <span>{selected.length} seleccionado{selected.length === 1 ? '' : 's'}</span>
          <button
            type="button"
            onClick={() => {
              if (!confirmBulk) {
                setConfirmBulk(true);
                return;
              }
              setConfirmBulk(false);
              handleBulkDelete();
            }}
            style={{ background: confirmBulk ? '#dc2626' : '#ffffff', color: confirmBulk ? '#ffffff' : '#dc2626', border: '1px solid #fecaca', borderRadius: '6px', padding: '7px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
          >
            {confirmBulk ? `¿Confirmar borrado de ${selected.length}?` : `Eliminar del historial (${selected.length})`}
          </button>
          <button type="button" onClick={() => { setSelected([]); setConfirmBulk(false); }} style={{ background: 'transparent', border: 'none', color: '#1d4ed8', fontSize: '12px', fontWeight: 600, cursor: 'pointer', marginLeft: 'auto' }}>
            Limpiar
          </button>
        </div>
      )}

      {/* Tabla */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: '960px', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '12px 12px 12px 18px', width: '36px' }}>
                  <input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? [] : items.map((i) => i.id))} aria-label="Seleccionar todos" style={{ accentColor: '#2563eb', width: '15px', height: '15px', cursor: 'pointer' }} />
                </th>
                <th style={{ padding: '12px' }}>
                  <button type="button" onClick={() => setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: '#475569', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: 0 }}>
                    REFERENCIA {sortOrder === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                  <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: '#94a3b8', marginTop: '2px' }}>UBICACIÓN</div>
                </th>
                <th style={{ padding: '12px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: '#475569' }}>FECHA</th>
                <th style={{ padding: '12px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: '#475569' }}>TIPO DE AJUSTE</th>
                <th style={{ padding: '12px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: '#475569' }}>RESPONSABLE</th>
                <th style={{ padding: '12px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: '#475569' }}>MOTIVO / PROPÓSITO</th>
                <th style={{ padding: '12px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: '#475569' }}>ESTADO</th>
                <th style={{ padding: '12px 18px 12px 12px', textAlign: 'right', color: '#2563eb' }}>
                  <Zap size={15} />
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                    Cargando ajustes…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: 0 }}>
                    <div style={{ margin: '12px', border: '1px solid #e2e8f0', borderLeft: '3px solid #2563eb', borderRadius: '8px', background: '#f8fafc', padding: '14px 16px', fontSize: '13px', color: '#0f172a' }}>
                      {total === 0 && !hasFilters
                        ? 'No hay ajustes de stock para mostrar. Añade un nuevo ajuste de stock haciendo clic en NUEVO AJUSTE DE STOCK arriba.'
                        : 'Sin coincidencias para los filtros aplicados.'}
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const meta = TYPE_META[item.type] || TYPE_META.correccion;
                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 12px 12px 18px' }}>
                        <input
                          type="checkbox"
                          checked={selected.includes(item.id)}
                          onChange={() => setSelected((prev) => (prev.includes(item.id) ? prev.filter((s) => s !== item.id) : [...prev, item.id]))}
                          aria-label={`Seleccionar ${item.id}`}
                          style={{ accentColor: '#2563eb', width: '15px', height: '15px', cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '12px', whiteSpace: 'nowrap' }}>{item.id}</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', whiteSpace: 'nowrap' }}>{item.locationRef}</div>
                      </td>
                      <td style={{ padding: '12px', color: '#475569', whiteSpace: 'nowrap', fontSize: '12px' }}>{formatDateTime(item.date)}</td>
                      <td style={{ padding: '12px', whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '999px', background: meta.bg, color: meta.color }}>
                          {meta.label}
                        </span>
                      </td>
                      <td style={{ padding: '12px', color: '#0f172a', whiteSpace: 'nowrap', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.responsible}>
                        {item.responsible}
                      </td>
                      <td style={{ padding: '12px', color: '#64748b', maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={`${item.reason} · ${item.sku} (${item.qtyDelta >= 0 ? '+' : ''}${item.qtyDelta} u)`}>
                        {item.reason}
                      </td>
                      <td style={{ padding: '12px', whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '999px', background: '#f0fdf4', color: '#15803d' }}>
                          Aplicado
                        </span>
                      </td>
                      <td style={{ padding: '12px 18px 12px 12px', textAlign: 'right' }}>
                        <button
                          type="button"
                          title={`Abrir ficha de ${item.sku}`}
                          onClick={() => router.push(`/products/${item.productId}`)}
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#2563eb', display: 'inline-flex' }}
                        >
                          <Zap size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {!loading && total > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 18px', borderTop: '1px solid #e2e8f0', fontSize: '12px', color: '#64748b' }}>
            <span>
              Mostrando {from}–{to} de {total}
            </span>
            <span style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
              <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} style={pagerBtnStyle(page <= 1)}>
                Anterior
              </button>
              <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} style={pagerBtnStyle(page >= totalPages)}>
                Siguiente
              </button>
            </span>
          </div>
        )}
      </div>

      {/* Modal Nuevo Ajuste */}
      {showModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Nuevo ajuste de stock"
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
              <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', margin: 0, flex: 1 }}>Nuevo Ajuste de stock</h2>
              <button type="button" onClick={() => !saving && setShowModal(false)} aria-label="Cerrar" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', minWidth: '44px', minHeight: '44px', alignItems: 'center', justifyContent: 'center' }}>
                <X size={18} />
              </button>
            </div>
            {formError && (
              <div role="alert" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '10px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 600 }}>
                {formError}
              </div>
            )}
            <label style={labelStyle}>
              Producto *
              <select value={fProductId} onChange={(e) => setFProductId(e.target.value)} required style={inputStyle}>
                <option value="">Seleccionar producto…</option>
                {catalog.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.sku} · {p.name} (stock {p.stock} u)
                  </option>
                ))}
              </select>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <label style={labelStyle}>
                Tipo de ajuste
                <select value={fType} onChange={(e) => setFType(e.target.value as typeof fType)} style={inputStyle}>
                  <option value="correccion">Corrección (±)</option>
                  <option value="consumo">Consumo (−)</option>
                  <option value="transferencia">Transferencia</option>
                </select>
              </label>
              {fType === 'transferencia' ? (
                <label style={labelStyle}>
                  Ubicación destino *
                  <select value={fToLocation} onChange={(e) => setFToLocation(e.target.value)} style={inputStyle}>
                    {locations.map((l) => (
                      <option key={l.ref} value={l.ref}>
                        {l.ref} · {l.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <label style={labelStyle}>
                  Cantidad {fType === 'consumo' ? '(negativa)' : '(±)'} *
                  <input value={fQty} onChange={(e) => setFQty(e.target.value)} placeholder={fType === 'consumo' ? '-10' : '+25 o -10'} inputMode="numeric" required style={inputStyle} />
                </label>
              )}
            </div>
            <label style={labelStyle}>
              Motivo / Propósito *
              <input value={fReason} onChange={(e) => setFReason(e.target.value)} placeholder="Ej. conteo físico, merma, traslado..." required style={inputStyle} />
            </label>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
              <button type="button" onClick={() => !saving && setShowModal(false)} style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '9px 16px', fontSize: '13px', fontWeight: 600, color: '#475569', cursor: saving ? 'not-allowed' : 'pointer', minHeight: '44px' }}>
                Cancelar
              </button>
              <button type="submit" disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: saving ? '#93c5fd' : '#2563eb', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '9px 16px', fontSize: '13px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', minHeight: '44px' }}>
                {saving && <Loader2 size={15} style={{ animation: 'inventa-spin 1s linear infinite' }} />}
                {saving ? 'Aplicando…' : 'Aplicar ajuste'}
              </button>
            </div>
          </form>
        </div>
      )}
      <style>{`@keyframes inventa-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 600,
  color: '#334155',
};

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
  minHeight: '44px',
};

const pagerBtnStyle = (disabled: boolean): React.CSSProperties => ({
  border: '1px solid #e2e8f0',
  background: '#ffffff',
  borderRadius: '6px',
  padding: '6px 12px',
  fontSize: '12px',
  fontWeight: 600,
  cursor: disabled ? 'not-allowed' : 'pointer',
  color: disabled ? '#cbd5e1' : '#334155',
  minHeight: '44px',
});
