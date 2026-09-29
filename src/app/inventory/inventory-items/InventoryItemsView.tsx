'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Boxes,
  Search,
  SlidersHorizontal,
  Plus,
  Zap,
  Image as ImageIcon,
  X,
  Loader2,
} from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { triggerNotificationRefresh } from '@/context/NotificationContext';
import LocationSelector from '@/components/inventory/LocationSelector';
import AdvancedFiltersDrawer from '@/components/inventory/AdvancedFiltersDrawer';

interface InventoryRow {
  id: string;
  sku: string;
  name: string;
  qty: number;
  safety: number;
  hasLevel: boolean;
  branch: string;
  locationRef: string;
  unitCost: number;
}

const PAGE_SIZE = 10;

function formatPEN(n: number): string {
  return `PEN ${Number(n || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function InventoryItemsView() {
  const router = useRouter();
  const [items, setItems] = useState<InventoryRow[]>([]);
  const [kpis, setKpis] = useState({ totalQty: 0, totalValue: 0, uniqueProducts: 0, activeLocations: 0 });
  const [integrations, setIntegrations] = useState<{ pending: boolean; missing: string[] }>({ pending: false, missing: [] });
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState('');
  const [hideZero, setHideZero] = useState(true);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmBulk, setConfirmBulk] = useState(false);
  // Divulgación progresiva + ubicación: toolbar principal mínima.
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [catalog, setCatalog] = useState<Array<{ id: string; sku: string; name: string; hasLevel: boolean }>>([]);
  const [locations, setLocations] = useState<Array<{ ref: string; name: string }>>([]);
  const [fProductId, setFProductId] = useState('');
  const [fQty, setFQty] = useState('0');
  const [fBranch, setFBranch] = useState('Sede Lima Central');
  const [fLocation, setFLocation] = useState('LOC-00004');

  const debouncedQuery = useDebounce(query, 300);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const allSelected = items.length > 0 && items.every((i) => selected.includes(i.id));

  const fetchItems = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        q: debouncedQuery.trim(),
        hideZero: hideZero ? '1' : '0',
        page: String(page),
        pageSize: String(PAGE_SIZE),
      });
      // Verdad de BD: la ubicación filtra stock, valor y rotación en el backend.
      if (selectedLocation !== 'all') params.set('location_id', selectedLocation);
      const res = await fetch(`/api/inventory/items?${params.toString()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        setTotal(data.total || 0);
        setKpis(data.kpis || { totalQty: 0, totalValue: 0, uniqueProducts: 0, activeLocations: 0 });
        if (data.integrations) setIntegrations(data.integrations);
        setSelected((prev) => prev.filter((id) => (data.items || []).some((i: InventoryRow) => i.id === id)));
      }
    } catch (err) {
      console.error('Error al cargar inventario:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, hideZero, page, selectedLocation]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, hideZero, selectedLocation]);

  useEffect(() => {
    if (selected.length === 0) setConfirmBulk(false);
  }, [selected]);

  const openCreate = async () => {
    setFormError(null);
    setFProductId('');
    setFQty('0');
    setFBranch('Sede Lima Central');
    setFLocation('LOC-00004');
    try {
      const [prodRes, locRes] = await Promise.all([
        fetch('/api/products?pageSize=100', { cache: 'no-store' }),
        fetch('/api/locations?pageSize=100', { cache: 'no-store' }),
      ]);
      if (prodRes.ok) {
        const pj = await prodRes.json();
        const withLevel = new Set(items.map((i) => i.id));
        setCatalog(
          (pj.items || []).map((p: any) => ({ id: p.id, sku: p.sku, name: p.name, hasLevel: withLevel.has(p.id) }))
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
      const res = await fetch('/api/inventory/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: fProductId,
          qty: fQty === '' ? NaN : Number(fQty),
          branch: fBranch,
          locationRef: fLocation,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'No se pudo registrar.');
      setShowModal(false);
      setBanner({ type: 'success', text: data?.message || 'Artículo registrado.' });
      triggerNotificationRefresh();
      fetchItems();
    } catch (err: any) {
      setFormError(err?.message || 'No se pudo registrar.');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkRemove = async () => {
    if (selected.length === 0) return;
    setBanner(null);
    try {
      const res = await fetch('/api/inventory/items', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selected }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'No se pudo completar.');
      setSelected([]);
      setBanner({ type: 'success', text: data?.message || 'Líneas eliminadas.' });
      fetchItems();
    } catch (err: any) {
      setBanner({ type: 'error', text: err?.message || 'No se pudo completar.' });
    }
  };

  const kpiCards = [
    { label: 'CANTIDAD TOTAL DE INVENTARIO', value: String(kpis.totalQty), caption: 'Unidades totales en stock', color: 'var(--color-forest-ink)' },
    { label: 'VALOR TOTAL DE INVENTARIO', value: formatPEN(kpis.totalValue), caption: 'Valor total del inventario', color: '#16a34a' },
    { label: 'PRODUCTOS ÚNICOS', value: String(kpis.uniqueProducts), caption: 'Productos distintos en el inventario', color: 'var(--color-obsidian)' },
    { label: 'UBICACIONES DE INVENTARIO TOTALES', value: String(kpis.activeLocations), caption: 'Ubicaciones de almacenamiento activas', color: 'var(--color-forest-ink)' },
  ];

  const hasFilters = debouncedQuery.trim() !== '' || selectedLocation !== 'all';
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(total, page * PAGE_SIZE);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Header */}
      <div style={{ background: '#ffffff', border: '1px solid var(--color-fog)', borderRadius: '10px', padding: '20px 22px', display: 'flex', alignItems: 'center', gap: '14px' }}>
        <span style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'var(--color-fog)', border: '1px solid var(--color-fog)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-charcoal)', flexShrink: 0 }}>
          <Boxes size={20} />
        </span>
        <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-obsidian)', margin: 0 }}>Artículos de inventario</h1>
      </div>

      <span style={{ fontSize: '13px', color: 'var(--color-slate)' }}>
        Resumen de inventario ({total} elemento{total === 1 ? '' : 's'})
      </span>

      {integrations.pending && (
        <span
          style={{ alignSelf: 'flex-start', fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '999px', background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' }}
        >
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

      {/* Toolbar — síntesis visual: búsqueda + ubicación + filtros avanzados */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', minWidth: 0 }}>
        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 0 }}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por SKU o producto..."
            aria-label="Buscar artículos"
            style={{ width: '100%', border: '1px solid var(--color-fog)', background: 'var(--color-paper)', borderRadius: '10px', padding: '9px 36px 9px 12px', fontSize: '13px', outline: 'none', boxSizing: 'border-box', minHeight: '38px' }}
          />
          <Search size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-pebble)' }} />
        </div>
        <div style={{ minWidth: 0, maxWidth: '100%' }}>
          <LocationSelector value={selectedLocation} onChange={setSelectedLocation} compact />
        </div>
        <button
          type="button"
          aria-label="Filtros avanzados"
          aria-expanded={showAdvanced}
          onClick={() => setShowAdvanced(true)}
          style={{ border: hideZero ? '1px solid var(--color-forest-ink)' : '1px solid var(--color-fog)', background: hideZero ? 'var(--color-linen-mist)' : '#ffffff', borderRadius: '9999px', padding: '9px 12px', cursor: 'pointer', color: 'var(--color-charcoal)', display: 'inline-flex', minHeight: '38px', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600 }}
        >
          <SlidersHorizontal size={16} />
          <span style={{ whiteSpace: 'nowrap' }}>Filtros{hideZero ? ' · 1' : ''}</span>
        </button>
        <button
          type="button"
          onClick={openCreate}
          style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--color-lime-voltage)', color: 'var(--color-forest-ink)', border: 'none', borderRadius: '9999px', padding: '9px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', minHeight: '38px', whiteSpace: 'nowrap' }}
        >
          <Plus size={15} /> Nuevo artículo
        </button>
      </div>
      {selectedLocation !== 'all' && (
        <span style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '999px', background: 'var(--color-linen-mist)', color: '#1d4ed8', border: '1px solid var(--color-forest-ink)', maxWidth: '100%' }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📍 {selectedLocation}</span>
          <button type="button" onClick={() => setSelectedLocation('all')} aria-label="Quitar filtro de ubicación" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 800 }}>
            ✕
          </button>
        </span>
      )}

      <AdvancedFiltersDrawer
        open={showAdvanced}
        onClose={() => setShowAdvanced(false)}
        onClear={() => setHideZero(true)}
        title="Filtros avanzados"
        activeCount={hideZero ? 1 : 0}
      >
        <button
          type="button"
          role="switch"
          aria-checked={hideZero}
          onClick={() => setHideZero((v) => !v)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', background: 'var(--color-paper)', border: '1px solid var(--color-fog)', borderRadius: '9999px', padding: '12px 14px', cursor: 'pointer', fontSize: '13px', color: 'var(--color-obsidian)', fontWeight: 600, minHeight: '44px', width: '100%' }}
        >
          Ocultar cantidad cero
          <span style={{ width: '38px', height: '22px', borderRadius: '999px', background: hideZero ? 'var(--color-forest-ink)' : 'var(--color-pebble)', position: 'relative', transition: 'background 0.15s ease', flexShrink: 0 }}>
            <span style={{ position: 'absolute', top: '2px', left: hideZero ? '20px' : '2px', width: '18px', height: '18px', borderRadius: '50%', background: '#ffffff', transition: 'left 0.15s ease', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }} />
          </span>
        </button>
        <p style={{ fontSize: '12px', color: 'var(--color-slate)', lineHeight: 1.5, margin: 0 }}>
          La ubicación se selecciona en la barra principal y filtra cantidad, valor y ubicaciones activas en tiempo real contra la base de datos.
        </p>
      </AdvancedFiltersDrawer>

      {/* Selección */}
      {selected.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--color-linen-mist)', border: '1px solid var(--color-forest-ink)', borderRadius: '10px', padding: '9px 14px', fontSize: '13px', fontWeight: 600, color: '#1d4ed8' }}>
          <span>{selected.length} seleccionado{selected.length === 1 ? '' : 's'}</span>
          <button
            type="button"
            onClick={() => {
              if (!confirmBulk) {
                setConfirmBulk(true);
                return;
              }
              setConfirmBulk(false);
              handleBulkRemove();
            }}
            style={{ background: confirmBulk ? 'var(--color-alarm-red)' : '#ffffff', color: confirmBulk ? '#ffffff' : 'var(--color-alarm-red)', border: '1px solid var(--color-alarm-red)', borderRadius: '6px', padding: '7px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
          >
            {confirmBulk ? `¿Confirmar? Quita ${selected.length} del inventario` : `Quitar del inventario (${selected.length})`}
          </button>
          <button type="button" onClick={() => { setSelected([]); setConfirmBulk(false); }} style={{ background: 'transparent', border: 'none', color: '#1d4ed8', fontSize: '12px', fontWeight: 600, cursor: 'pointer', marginLeft: 'auto' }}>
            Limpiar
          </button>
        </div>
      )}

      {/* Tabla */}
      <div style={{ background: '#ffffff', border: '1px solid var(--color-fog)', borderRadius: '10px', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: '760px', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-fog)', textAlign: 'left' }}>
                <th style={{ padding: '12px 12px 12px 18px', width: '36px' }}>
                  <input type="checkbox" checked={items.length > 0 && items.every((i) => selected.includes(i.id))} onChange={() => setSelected((prev) => (items.every((i) => prev.includes(i.id)) ? prev.filter((s) => !items.some((i) => i.id === s)) : [...new Set([...prev, ...items.map((i) => i.id)])]))} aria-label="Seleccionar todos" style={{ accentColor: 'var(--color-forest-ink)', width: '15px', height: '15px', cursor: 'pointer' }} />
                </th>
                <th style={{ padding: '12px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--color-charcoal)' }}>NÚM.</th>
                <th style={{ padding: '12px', width: '40px', color: 'var(--color-pebble)' }}>
                  <ImageIcon size={15} />
                </th>
                <th style={{ padding: '12px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--color-charcoal)' }}>NOMBRE</th>
                <th style={{ padding: '12px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--color-charcoal)' }}>CANT</th>
                <th style={{ padding: '12px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--color-charcoal)' }}>SUCURSAL</th>
                <th style={{ padding: '12px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--color-charcoal)' }}>UBICACIÓN</th>
                <th style={{ padding: '12px 18px 12px 12px', textAlign: 'right', color: 'var(--color-forest-ink)' }}>
                  <Zap size={15} />
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: 'var(--color-pebble)' }}>
                    Cargando inventario…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: 0 }}>
                    <div style={{ margin: '12px', border: '1px solid var(--color-fog)', borderLeft: '3px solid var(--color-forest-ink)', borderRadius: '10px', background: 'var(--color-paper)', padding: '14px 16px', fontSize: '13px', color: 'var(--color-obsidian)' }}>
                      {total === 0 && !hasFilters
                        ? 'No hay artículos de inventario para mostrar. Añade un nuevo artículo de inventario haciendo clic en NUEVO ARTÍCULO arriba.'
                        : selectedLocation !== 'all'
                          ? `Sin stock en la ubicación ${selectedLocation} con los filtros aplicados.`
                          : 'Sin coincidencias para los filtros aplicados.'}
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--color-fog)' }}>
                    <td style={{ padding: '12px 12px 12px 18px' }}>
                      <input
                        type="checkbox"
                        checked={selected.includes(item.id)}
                        onChange={() => setSelected((prev) => (prev.includes(item.id) ? prev.filter((s) => s !== item.id) : [...prev, item.id]))}
                        aria-label={`Seleccionar ${item.sku}`}
                        style={{ accentColor: 'var(--color-forest-ink)', width: '15px', height: '15px', cursor: 'pointer' }}
                      />
                    </td>
                    <td style={{ padding: '12px', color: 'var(--color-slate)', fontVariantNumeric: 'tabular-nums' }}>
                      {(page - 1) * PAGE_SIZE + idx + 1}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'var(--color-fog)', border: '1px solid var(--color-fog)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-pebble)' }}>
                        <ImageIcon size={15} />
                      </span>
                    </td>
                    <td style={{ padding: '12px', color: 'var(--color-obsidian)' }}>
                      <div style={{ fontWeight: 600 }}>{item.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--color-pebble)' }}>{item.sku}</div>
                    </td>
                    <td style={{ padding: '12px', fontWeight: 700, color: 'var(--color-obsidian)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                      {item.qty.toLocaleString()} u
                    </td>
                    <td style={{ padding: '12px', color: 'var(--color-charcoal)', whiteSpace: 'nowrap' }}>{item.branch}</td>
                    <td style={{ padding: '12px', color: 'var(--color-charcoal)', whiteSpace: 'nowrap' }}>{item.locationRef}</td>
                    <td style={{ padding: '12px 18px 12px 12px', textAlign: 'right' }}>
                      <button
                        type="button"
                        title={`Abrir ficha de ${item.sku}`}
                        onClick={() => router.push(`/products/${item.id}`)}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-forest-ink)', display: 'inline-flex' }}
                      >
                        <Zap size={15} />
                      </button>
                    </td>
                  </tr>
                ))
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

      {/* Modal Nuevo Artículo */}
      {showModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Nuevo artículo de inventario"
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 80, padding: '16px' }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !saving) setShowModal(false);
          }}
        >
          <form
            onSubmit={handleCreate}
            style={{ background: '#ffffff', borderRadius: '10px', padding: '24px', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--color-obsidian)', margin: 0, flex: 1 }}>Nuevo Artículo de inventario</h2>
              <button type="button" onClick={() => !saving && setShowModal(false)} aria-label="Cerrar" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-slate)', display: 'flex', minWidth: '44px', minHeight: '44px', alignItems: 'center', justifyContent: 'center' }}>
                <X size={18} />
              </button>
            </div>
            {formError && (
              <div role="alert" style={{ background: '#fef2f2', border: '1px solid var(--color-alarm-red)', color: '#991b1b', padding: '10px 12px', borderRadius: '10px', fontSize: '13px', fontWeight: 600 }}>
                {formError}
              </div>
            )}
            <label style={labelStyle}>
              Producto *
              <select value={fProductId} onChange={(e) => setFProductId(e.target.value)} required style={inputStyle}>
                <option value="">Seleccionar producto…</option>
                {catalog.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.sku} · {p.name}{p.hasLevel ? ' (en inventario)' : ''}
                  </option>
                ))}
              </select>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <label style={labelStyle}>
                Cantidad inicial *
                <input value={fQty} onChange={(e) => setFQty(e.target.value)} inputMode="numeric" required style={inputStyle} />
              </label>
              <label style={labelStyle}>
                Ubicación
                <select value={fLocation} onChange={(e) => setFLocation(e.target.value)} style={inputStyle}>
                  {locations.map((l) => (
                    <option key={l.ref} value={l.ref}>
                      {l.ref} · {l.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label style={labelStyle}>
              Sucursal
              <input value={fBranch} onChange={(e) => setFBranch(e.target.value)} style={inputStyle} />
            </label>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
              <button type="button" onClick={() => !saving && setShowModal(false)} style={{ background: '#ffffff', border: '1px solid var(--color-pebble)', borderRadius: '9999px', padding: '9px 16px', fontSize: '13px', fontWeight: 600, color: 'var(--color-charcoal)', cursor: saving ? 'not-allowed' : 'pointer', minHeight: '44px' }}>
                Cancelar
              </button>
              <button type="submit" disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: saving ? 'var(--color-pebble)' : 'var(--color-forest-ink)', color: '#ffffff', border: 'none', borderRadius: '9999px', padding: '9px 16px', fontSize: '13px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', minHeight: '44px' }}>
                {saving && <Loader2 size={15} style={{ animation: 'inventa-spin 1s linear infinite' }} />}
                {saving ? 'Registrando…' : 'Registrar entrada'}
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
