'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Send,
  Search,
  SlidersHorizontal,
  Plus,
  Zap,
  Check,
  ChevronUp,
  ChevronDown,
  X,
  Loader2,
} from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';

interface DispatchLine {
  productId: string;
  sku: string;
  name: string;
  qty: number;
}

interface DispatchItem {
  id: string;
  type: 'venta' | 'traslado' | 'devolucion';
  date: string;
  destination: string;
  clientRef: string | null;
  dispatchedBy: string;
  lines: DispatchLine[];
  totalQty: number;
  status: 'transito' | 'terminado';
  completedAt: string | null;
  note: string;
}

const TYPE_META: Record<string, { label: string; color: string; bg: string }> = {
  venta: { label: 'Venta', color: '#1d4ed8', bg: 'var(--color-linen-mist)' },
  traslado: { label: 'Traslado', color: 'var(--color-obsidian)', bg: 'var(--color-fog)' },
  devolucion: { label: 'Devolución', color: '#b45309', bg: '#fffbeb' },
};

const PAGE_SIZE = 10;

export default function OutgoingView() {
  const router = useRouter();
  const [items, setItems] = useState<DispatchItem[]>([]);
  const [kpis, setKpis] = useState({ total: 0, thisMonth: 0, transito: 0, terminado: 0 });
  const [integrations, setIntegrations] = useState<{ pending: boolean; missing: string[] }>({ pending: false, missing: [] });
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [type, setType] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [completing, setCompleting] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [catalog, setCatalog] = useState<Array<{ id: string; sku: string; name: string }>>([]);
  const [clients, setClients] = useState<Array<{ ref: string; name: string }>>([]);
  const [fType, setFType] = useState<'venta' | 'traslado' | 'devolucion'>('venta');
  const [fClientRef, setFClientRef] = useState('');
  const [fDestination, setFDestination] = useState('');
  const [fNote, setFNote] = useState('');
  const [fLines, setFLines] = useState<Array<{ productId: string; qty: string }>>([{ productId: '', qty: '' }]);

  const debouncedQuery = useDebounce(query, 300);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const allSelected = items.length > 0 && items.every((i) => selected.includes(i.id));

  const fetchDispatches = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        q: debouncedQuery.trim(),
        status,
        type,
        order: sortOrder,
        page: String(page),
        pageSize: String(PAGE_SIZE),
      });
      const res = await fetch(`/api/inventory/dispatches?${params.toString()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        setTotal(data.total || 0);
        setKpis(data.kpis || { total: 0, thisMonth: 0, transito: 0, terminado: 0 });
        if (data.integrations) setIntegrations(data.integrations);
        setSelected((prev) => prev.filter((id) => (data.items || []).some((i: DispatchItem) => i.id === id)));
      }
    } catch (err) {
      console.error('Error al cargar despachos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDispatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, status, type, sortOrder, page]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, status, type]);

  const openCreate = async () => {
    setFormError(null);
    setFType('venta');
    setFClientRef('');
    setFDestination('');
    setFNote('');
    setFLines([{ productId: '', qty: '' }]);
    try {
      const [prodRes, cliRes] = await Promise.all([
        fetch('/api/products?pageSize=100', { cache: 'no-store' }),
        fetch('/api/clients?pageSize=100', { cache: 'no-store' }),
      ]);
      if (prodRes.ok) {
        const pj = await prodRes.json();
        setCatalog((pj.items || []).map((p: any) => ({ id: p.id, sku: p.sku, name: p.name })));
      }
      if (cliRes.ok) {
        const cj = await cliRes.json();
        setClients((cj.items || []).map((c: any) => ({ ref: c.ref, name: c.name })));
      }
    } catch {
      // el modal muestra el error al guardar si faltan datos
    }
    setShowModal(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const lines = fLines.filter((l) => l.productId);
    if (lines.length === 0) {
      setFormError('Agrega al menos una línea con producto.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/inventory/dispatches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: fType,
          destination: fDestination,
          clientRef: fClientRef || undefined,
          note: fNote,
          lines: lines.map((l) => ({ productId: l.productId, qty: l.qty === '' ? NaN : Number(l.qty) })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'No se pudo registrar.');
      setShowModal(false);
      setBanner({ type: 'success', text: `Despacho ${data.item?.id || ''} creado: ${data.item?.totalQty || 0} u descontadas del stock.` });
      fetchDispatches();
    } catch (err: any) {
      setFormError(err?.message || 'No se pudo registrar.');
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async (item: DispatchItem) => {
    if (item.status === 'terminado' || completing) return;
    setCompleting(item.id);
    setBanner(null);
    try {
      const res = await fetch(`/api/inventory/dispatches/${encodeURIComponent(item.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'terminado' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'No se pudo completar.');
      setBanner({ type: 'success', text: `Despacho ${item.id} marcado como terminado.` });
      fetchDispatches();
    } catch (err: any) {
      setBanner({ type: 'error', text: err?.message || 'No se pudo completar.' });
    } finally {
      setCompleting(null);
    }
  };

  const handleBulkDelete = async () => {
    const ids = selected.filter((id) => items.find((i) => i.id === id)?.status === 'transito');
    if (ids.length === 0) {
      setBanner({ type: 'error', text: 'Solo se pueden anular despachos en tránsito.' });
      return;
    }
    setBanner(null);
    try {
      const res = await fetch('/api/inventory/dispatches', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'No se pudo completar.');
      setSelected([]);
      setBanner({ type: 'success', text: data?.message || 'Despachos anulados.' });
      fetchDispatches();
    } catch (err: any) {
      setBanner({ type: 'error', text: err?.message || 'No se pudo completar.' });
    }
  };

  const kpiCards = [
    { label: 'DESPACHOS TOTALES', value: String(kpis.total), caption: 'Todos los registros de despacho', color: 'var(--color-forest-ink)' },
    { label: 'ESTE MES', value: String(kpis.thisMonth), caption: 'Despachos de este mes', color: '#f97316' },
    { label: 'EN TRÁNSITO', value: String(kpis.transito), caption: 'En camino al cliente o a la sucursal', color: '#1e3a8a' },
    { label: 'TERMINADO', value: String(kpis.terminado), caption: 'Despachado correctamente', color: '#15803d' },
  ];

  const hasFilters = debouncedQuery.trim() !== '' || status !== 'all' || type !== 'all';
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(total, page * PAGE_SIZE);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Header */}
      <div style={{ background: '#ffffff', border: '1px solid var(--color-fog)', borderRadius: '10px', padding: '20px 22px', display: 'flex', alignItems: 'center', gap: '14px' }}>
        <span style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'var(--color-fog)', border: '1px solid var(--color-fog)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-charcoal)', flexShrink: 0 }}>
          <Send size={20} />
        </span>
        <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-obsidian)', margin: 0 }}>Despachos de inventario</h1>
      </div>

      <span style={{ fontSize: '13px', color: 'var(--color-slate)' }}>
        Gestionar despachos de inventario ({total} registro{total === 1 ? '' : 's'})
      </span>

      {integrations.pending && (
        <span style={{ alignSelf: 'flex-start', fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '999px', background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' }}>
          Pendiente de configuración: {integrations.missing.join(', ')}
        </span>
      )}

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', background: '#ffffff', border: '1px solid var(--color-fog)', borderRadius: '10px', overflow: 'hidden' }}>
        {kpiCards.map((k, idx) => (
          <div key={k.label} style={{ padding: '18px 20px', borderLeft: idx === 0 ? 'none' : '1px solid var(--color-fog)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--color-charcoal)' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: k.color }} />
              {k.label}
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-obsidian)', marginTop: '6px', fontVariantNumeric: 'tabular-nums' }}>
              {k.value}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-slate)', marginTop: '6px' }}>{k.caption}</div>
          </div>
        ))}
      </div>

      {/* Banner */}
      {banner && (
        <div
          role={banner.type === 'error' ? 'alert' : 'status'}
          style={{ background: banner.type === 'success' ? '#f0fdf4' : '#fef2f2', border: banner.type === 'success' ? '1px solid #bbf7d0' : '1px solid var(--color-alarm-red)', color: banner.type === 'success' ? '#166534' : '#991b1b', padding: '12px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, display: 'flex', gap: '8px', alignItems: 'center' }}
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
            placeholder="Buscar por expedición, cliente o SKU..."
            aria-label="Buscar despachos"
            style={{ width: '100%', border: '1px solid var(--color-fog)', background: 'var(--color-paper)', borderRadius: '10px', padding: '9px 36px 9px 12px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
          />
          <Search size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-pebble)' }} />
        </div>
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            aria-label="Filtros"
            aria-expanded={showFilters}
            style={{ border: '1px solid var(--color-fog)', background: status !== 'all' || type !== 'all' ? 'var(--color-linen-mist)' : '#ffffff', borderRadius: '9999px', padding: '9px 12px', cursor: 'pointer', color: 'var(--color-charcoal)', display: 'flex', minHeight: '38px', alignItems: 'center' }}
          >
            <SlidersHorizontal size={16} />
          </button>
          {showFilters && (
            <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', background: '#ffffff', border: '1px solid var(--color-fog)', borderRadius: '10px', boxShadow: '0 12px 32px -8px rgba(15,23,42,0.18)', padding: '12px', zIndex: 50, minWidth: '220px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-charcoal)' }}>
                ESTADO
                <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ display: 'block', width: '100%', marginTop: '4px', padding: '8px', borderRadius: '6px', border: '1px solid var(--color-pebble)', fontSize: '13px' }}>
                  <option value="all">Todos</option>
                  <option value="transito">En tránsito</option>
                  <option value="terminado">Terminado</option>
                </select>
              </label>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-charcoal)' }}>
                TIPO
                <select value={type} onChange={(e) => setType(e.target.value)} style={{ display: 'block', width: '100%', marginTop: '4px', padding: '8px', borderRadius: '6px', border: '1px solid var(--color-pebble)', fontSize: '13px' }}>
                  <option value="all">Todos</option>
                  <option value="venta">Venta</option>
                  <option value="traslado">Traslado</option>
                  <option value="devolucion">Devolución</option>
                </select>
              </label>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={openCreate}
          style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--color-lime-voltage)', color: 'var(--color-forest-ink)', border: 'none', borderRadius: '9999px', padding: '9px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', minHeight: '38px' }}
        >
          <Plus size={15} /> Nuevo Despacho de inventario
        </button>
      </div>

      {/* Selección */}
      {selected.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--color-linen-mist)', border: '1px solid var(--color-forest-ink)', borderRadius: '10px', padding: '9px 14px', fontSize: '13px', fontWeight: 600, color: '#1d4ed8' }}>
          <span>{selected.length} seleccionado{selected.length === 1 ? '' : 's'}</span>
          <button
            type="button"
            onClick={handleBulkDelete}
            style={{ background: '#ffffff', color: 'var(--color-alarm-red)', border: '1px solid var(--color-alarm-red)', borderRadius: '6px', padding: '7px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
          >
            Anular en tránsito ({selected.length})
          </button>
          <button type="button" onClick={() => setSelected([])} style={{ background: 'transparent', border: 'none', color: '#1d4ed8', fontSize: '12px', fontWeight: 600, cursor: 'pointer', marginLeft: 'auto' }}>
            Limpiar
          </button>
        </div>
      )}

      {/* Tabla */}
      <div style={{ background: '#ffffff', border: '1px solid var(--color-fog)', borderRadius: '10px', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: '980px', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-fog)', textAlign: 'left' }}>
                <th style={{ padding: '12px 12px 12px 18px', width: '36px' }}>
                  <input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? [] : items.map((i) => i.id))} aria-label="Seleccionar todos" style={{ accentColor: 'var(--color-forest-ink)', width: '15px', height: '15px', cursor: 'pointer' }} />
                </th>
                <th style={{ padding: '12px' }}>
                  <button type="button" onClick={() => setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--color-charcoal)', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: 0 }}>
                    N.º EXPEDICIÓN {sortOrder === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                </th>
                <th style={{ padding: '12px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--color-charcoal)' }}>TIPO</th>
                <th style={{ padding: '12px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--color-charcoal)' }}>FECHA</th>
                <th style={{ padding: '12px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--color-charcoal)' }}>CLIENTE / DESTINO</th>
                <th style={{ padding: '12px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--color-charcoal)' }}>DESPACHADO POR</th>
                <th style={{ padding: '12px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--color-charcoal)' }}>CANT DESPACHADA</th>
                <th style={{ padding: '12px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--color-charcoal)' }}>ESTADO</th>
                <th style={{ padding: '12px 18px 12px 12px', textAlign: 'right', color: 'var(--color-forest-ink)' }}>
                  <Zap size={15} />
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ padding: '32px', textAlign: 'center', color: 'var(--color-pebble)' }}>
                    Cargando despachos…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: 0 }}>
                    <div style={{ margin: '12px', border: '1px solid var(--color-fog)', borderLeft: '3px solid var(--color-forest-ink)', borderRadius: '10px', background: 'var(--color-paper)', padding: '14px 16px', fontSize: '13px', color: 'var(--color-obsidian)' }}>
                      {total === 0 && !hasFilters
                        ? 'No hay registros de despacho para mostrar. Agregue un nuevo registro de despacho haciendo clic en NUEVO DESPACHO arriba.'
                        : 'Sin coincidencias para los filtros aplicados.'}
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const meta = TYPE_META[item.type] || TYPE_META.venta;
                  const done = item.status === 'terminado';
                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--color-fog)' }}>
                      <td style={{ padding: '12px 12px 12px 18px' }}>
                        <input
                          type="checkbox"
                          checked={selected.includes(item.id)}
                          onChange={() => setSelected((prev) => (prev.includes(item.id) ? prev.filter((s) => s !== item.id) : [...prev, item.id]))}
                          aria-label={`Seleccionar ${item.id}`}
                          style={{ accentColor: 'var(--color-forest-ink)', width: '15px', height: '15px', cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ padding: '12px', fontWeight: 700, color: 'var(--color-obsidian)', whiteSpace: 'nowrap', fontSize: '12px' }}>{item.id}</td>
                      <td style={{ padding: '12px', whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '999px', background: meta.bg, color: meta.color }}>
                          {meta.label}
                        </span>
                      </td>
                      <td style={{ padding: '12px', color: 'var(--color-charcoal)', whiteSpace: 'nowrap', fontSize: '12px' }}>
                        {new Date(item.date).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ padding: '12px', color: 'var(--color-obsidian)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.destination}>
                        {item.destination}
                      </td>
                      <td style={{ padding: '12px', color: 'var(--color-charcoal)', whiteSpace: 'nowrap', maxWidth: '170px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.dispatchedBy}>
                        {item.dispatchedBy}
                      </td>
                      <td style={{ padding: '12px', fontWeight: 700, color: 'var(--color-obsidian)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                        {item.totalQty.toLocaleString()} u
                      </td>
                      <td style={{ padding: '12px', whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '999px', background: done ? '#f0fdf4' : '#fffbeb', color: done ? '#15803d' : '#b45309' }}>
                          {done ? 'Terminado' : 'En tránsito'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 18px 12px 12px', textAlign: 'right' }}>
                        {!done ? (
                          <button
                            type="button"
                            title={`Marcar ${item.id} como terminado`}
                            onClick={() => handleComplete(item)}
                            disabled={completing === item.id}
                            style={{ background: 'transparent', border: 'none', cursor: completing === item.id ? 'not-allowed' : 'pointer', color: 'var(--color-forest-ink)', display: 'inline-flex' }}
                          >
                            {completing === item.id ? <Loader2 size={15} style={{ animation: 'inventa-spin 1s linear infinite' }} /> : <Zap size={15} />}
                          </button>
                        ) : (
                          <button
                            type="button"
                            title={`Ver ${item.id} en actividad`}
                            onClick={() => router.push(`/activity-log?q=${encodeURIComponent(item.id)}`)}
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-pebble)', display: 'inline-flex' }}
                          >
                            <Check size={15} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {!loading && total > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 18px', borderTop: '1px solid var(--color-fog)', fontSize: '12px', color: 'var(--color-slate)' }}>
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

      {/* Modal Nuevo Despacho */}
      {showModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Nuevo despacho de inventario"
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 80, padding: '16px' }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !saving) setShowModal(false);
          }}
        >
          <form
            onSubmit={handleCreate}
            style={{ background: '#ffffff', borderRadius: '10px', padding: '24px', width: '100%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--color-obsidian)', margin: 0, flex: 1 }}>Nuevo Despacho de inventario</h2>
              <button type="button" onClick={() => !saving && setShowModal(false)} aria-label="Cerrar" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-slate)', display: 'flex', minWidth: '44px', minHeight: '44px', alignItems: 'center', justifyContent: 'center' }}>
                <X size={18} />
              </button>
            </div>
            {formError && (
              <div role="alert" style={{ background: '#fef2f2', border: '1px solid var(--color-alarm-red)', color: '#991b1b', padding: '10px 12px', borderRadius: '10px', fontSize: '13px', fontWeight: 600 }}>
                {formError}
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <label style={labelStyle}>
                Tipo *
                <select value={fType} onChange={(e) => setFType(e.target.value as typeof fType)} style={inputStyle}>
                  <option value="venta">Venta</option>
                  <option value="traslado">Traslado</option>
                  <option value="devolucion">Devolución</option>
                </select>
              </label>
              <label style={labelStyle}>
                Cliente (opcional)
                <select value={fClientRef} onChange={(e) => {
                  const ref = e.target.value;
                  setFClientRef(ref);
                  const found = clients.find((c) => c.ref === ref);
                  if (found) setFDestination(found.name);
                }} style={inputStyle}>
                  <option value="">Seleccionar…</option>
                  {clients.map((c) => (
                    <option key={c.ref} value={c.ref}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label style={labelStyle}>
              Cliente / Destino *
              <input value={fDestination} onChange={(e) => setFDestination(e.target.value)} placeholder="Cliente o destino del despacho" required style={inputStyle} />
            </label>
            <div>
              <span style={{ ...labelStyle, marginBottom: '6px', display: 'block' }}>Líneas *</span>
              {fLines.map((line, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 110px 44px', gap: '8px', marginBottom: '8px' }}>
                  <select
                    value={line.productId}
                    onChange={(e) => setFLines((prev) => prev.map((l, i) => (i === idx ? { ...l, productId: e.target.value } : l)))}
                    required
                    style={inputStyle}
                    aria-label={`Producto línea ${idx + 1}`}
                  >
                    <option value="">Producto…</option>
                    {catalog.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.sku} · {p.name}
                      </option>
                    ))}
                  </select>
                  <input
                    value={line.qty}
                    onChange={(e) => setFLines((prev) => prev.map((l, i) => (i === idx ? { ...l, qty: e.target.value } : l)))}
                    placeholder="Cant."
                    inputMode="numeric"
                    required
                    aria-label={`Cantidad línea ${idx + 1}`}
                    style={inputStyle}
                  />
                  <button
                    type="button"
                    onClick={() => setFLines((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev))}
                    aria-label={`Quitar línea ${idx + 1}`}
                    disabled={fLines.length <= 1}
                    style={{ background: '#ffffff', border: '1px solid var(--color-fog)', borderRadius: '9999px', cursor: fLines.length <= 1 ? 'not-allowed' : 'pointer', color: 'var(--color-pebble)', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '44px' }}
                  >
                    <X size={15} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setFLines((prev) => [...prev, { productId: '', qty: '' }])}
                style={{ background: 'transparent', border: '1px dashed var(--color-pebble)', borderRadius: '9999px', padding: '8px 12px', fontSize: '12px', fontWeight: 600, color: 'var(--color-charcoal)', cursor: 'pointer', minHeight: '44px', width: '100%' }}
              >
                + Añadir línea
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
              <button type="button" onClick={() => !saving && setShowModal(false)} style={{ background: '#ffffff', border: '1px solid var(--color-pebble)', borderRadius: '9999px', padding: '9px 16px', fontSize: '13px', fontWeight: 600, color: 'var(--color-charcoal)', cursor: saving ? 'not-allowed' : 'pointer', minHeight: '44px' }}>
                Cancelar
              </button>
              <button type="submit" disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: saving ? 'var(--color-pebble)' : 'var(--color-forest-ink)', color: '#ffffff', border: 'none', borderRadius: '9999px', padding: '9px 16px', fontSize: '13px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', minHeight: '44px' }}>
                {saving && <Loader2 size={15} style={{ animation: 'inventa-spin 1s linear infinite' }} />}
                {saving ? 'Registrando…' : 'Crear despacho'}
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
  color: 'var(--color-charcoal)',
};

const inputStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  marginTop: '4px',
  padding: '9px 12px',
  borderRadius: '10px',
  border: '1px solid var(--color-pebble)',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
  fontWeight: 400,
  minHeight: '44px',
};

const pagerBtnStyle = (disabled: boolean): React.CSSProperties => ({
  border: '1px solid var(--color-fog)',
  background: '#ffffff',
  borderRadius: '6px',
  padding: '6px 12px',
  fontSize: '12px',
  fontWeight: 600,
  cursor: disabled ? 'not-allowed' : 'pointer',
  color: disabled ? 'var(--color-pebble)' : 'var(--color-charcoal)',
  minHeight: '44px',
});
