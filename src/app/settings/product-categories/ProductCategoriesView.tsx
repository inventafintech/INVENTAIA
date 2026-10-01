'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shapes,
  Search,
  Plus,
  Zap,
  ChevronUp,
  ChevronDown,
  X,
  Loader2,
} from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';

import { apiFetch } from '@/lib/apiFetch';
interface CategoryItem {
  id: string;
  name: string;
  description: string;
  parentId: string | null;
  parentName: string | null;
  taxRate: number | null;
  expiryDays: number | null;
  productCount: number;
  subCount: number;
}

const PAGE_SIZE = 10;

export default function ProductCategoriesView() {
  const router = useRouter();
  const [items, setItems] = useState<CategoryItem[]>([]);
  const [kpis, setKpis] = useState({ total: 0, subcategories: 0, avgSubs: 0, withTax: 0, withTaxTotal: 0 });
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmBulk, setConfirmBulk] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<CategoryItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [fName, setFName] = useState('');
  const [fDescription, setFDescription] = useState('');
  const [fParentId, setFParentId] = useState('');
  const [fTaxRate, setFTaxRate] = useState('');
  const [fExpiry, setFExpiry] = useState('');
  const [allCategories, setAllCategories] = useState<Array<{ id: string; name: string }>>([]);

  const debouncedQuery = useDebounce(query, 300);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        q: debouncedQuery.trim(),
        order: sortOrder,
        page: String(page),
        pageSize: String(PAGE_SIZE),
      });
      const res = await apiFetch(`/api/inventory/categories?${params.toString()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        setTotal(data.total || 0);
        setKpis(data.kpis || { total: 0, subcategories: 0, avgSubs: 0, withTax: 0, withTaxTotal: 0 });
        setSelected((prev) => prev.filter((id) => (data.items || []).some((i: CategoryItem) => i.id === id)));
      }
      const allRes = await apiFetch('/api/inventory/categories?pageSize=100', { cache: 'no-store' });
      if (allRes.ok) {
        const allData = await allRes.json();
        setAllCategories((allData.items || []).map((i: CategoryItem) => ({ id: i.id, name: i.name })));
      }
    } catch (err) {
      console.error('Error al cargar categorías:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, sortOrder, page]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery]);

  useEffect(() => {
    if (selected.length === 0) setConfirmBulk(false);
  }, [selected]);

  const openCreate = () => {
    setEditing(null);
    setFName('');
    setFDescription('');
    setFParentId('');
    setFTaxRate('');
    setFExpiry('');
    setFormError(null);
    setShowModal(true);
  };

  const openEdit = (item: CategoryItem) => {
    setEditing(item);
    setFName(item.name);
    setFDescription(item.description);
    setFParentId(item.parentId || '');
    setFTaxRate(item.taxRate !== null ? String(item.taxRate) : '');
    setFExpiry(item.expiryDays !== null ? String(item.expiryDays) : '');
    setFormError(null);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: fName,
        description: fDescription,
        parentId: fParentId || null,
        taxRate: fTaxRate === '' ? null : Number(fTaxRate),
        expiryDays: fExpiry === '' ? null : Number(fExpiry),
      };
      let res: Response;
      if (editing) {
        res = await apiFetch(`/api/inventory/categories/${encodeURIComponent(editing.id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await apiFetch('/api/inventory/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'No se pudo guardar.');
      setShowModal(false);
      setBanner({ type: 'success', text: editing ? 'Categoría actualizada.' : `Categoría "${data.item?.name || ''}" creada.` });
      fetchCategories();
    } catch (err: any) {
      setFormError(err?.message || 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editing) return;
    setFormError(null);
    setDeleting(true);
    try {
      const res = await apiFetch(`/api/inventory/categories/${encodeURIComponent(editing.id)}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'No se pudo eliminar.');
      setShowModal(false);
      setBanner({ type: 'success', text: 'Categoría eliminada.' });
      fetchCategories();
    } catch (err: any) {
      setFormError(err?.message || 'No se pudo eliminar.');
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selected.length === 0) return;
    setBanner(null);
    let ok = 0;
    let blocked = 0;
    for (const id of selected) {
      try {
        const res = await apiFetch(`/api/inventory/categories/${encodeURIComponent(id)}`, { method: 'DELETE' });
        if (res.ok) ok++;
        else if (res.status === 409) blocked++;
      } catch {
        // continuar con el resto
      }
    }
    setSelected([]);
    setBanner({
      type: ok > 0 ? 'success' : 'error',
      text: ok > 0
        ? `Se eliminaron ${ok} categorías.${blocked > 0 ? ` ${blocked} tienen productos o hijas.` : ''}`
        : 'No se pudo eliminar la selección (revise productos o subcategorías asociadas).',
    });
    fetchCategories();
  };

  const kpiCards = [
    { label: 'TOTAL DE CATEGORÍAS', value: String(kpis.total), caption: 'Categorías de productos', color: 'var(--color-forest-ink)' },
    { label: 'SUBCATEGORÍAS', value: String(kpis.subcategories), caption: 'Subcategorías totales', color: '#0ea5e9' },
    { label: 'PROM. SUBCATEGORÍAS', value: String(kpis.avgSubs), caption: 'Por categoría', color: '#16a34a' },
    { label: 'CON TASAS DE IMPUESTOS', value: `${kpis.withTax} /${kpis.withTaxTotal}`, caption: 'Categorías con impuestos', color: '#f97316' },
  ];

  const hasFilters = debouncedQuery.trim() !== '';
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(total, page * PAGE_SIZE);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.04em', color: 'var(--color-slate)' }}>
        CONFIGURACIÓN / CATEGORÍAS
      </span>

      {/* Header */}
      <div style={{ background: '#ffffff', border: '1px solid var(--color-fog)', borderRadius: '10px', padding: '20px 22px', display: 'flex', alignItems: 'center', gap: '14px' }}>
        <span style={{ width: '52px', height: '52px', borderRadius: '10px', background: 'var(--color-fog)', border: '1px solid var(--color-fog)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-pebble)', flexShrink: 0 }}>
          <Shapes size={24} />
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', color: 'var(--color-pebble)' }}>CATÁLOGO</div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-obsidian)', margin: '2px 0 8px 0' }}>Categorías de Productos</h1>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.04em', background: 'var(--color-paper)', border: '1px solid var(--color-fog)', color: 'var(--color-slate)', padding: '3px 9px', borderRadius: '6px', whiteSpace: 'nowrap' }}>
              CATEGORÍAS {kpis.total}
            </span>
            <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.04em', background: 'var(--color-paper)', border: '1px solid var(--color-fog)', color: 'var(--color-slate)', padding: '3px 9px', borderRadius: '6px', whiteSpace: 'nowrap' }}>
              SUBCATEGORÍAS {kpis.subcategories}
            </span>
          </div>
        </div>
      </div>

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

      {/* Sección */}
      <div style={{ background: '#ffffff', border: '1px solid var(--color-fog)', borderRadius: '10px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '1px solid var(--color-fog)', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--color-charcoal)' }}>CATEGORÍAS</div>
            <div style={{ fontSize: '13px', color: 'var(--color-slate)', marginTop: '2px' }}>Descripción General de Gestión de Categorías</div>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--color-pebble)' }}>{total} Categorías</span>
        </div>

        <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '220px', maxWidth: '420px' }}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre o descripción..."
              aria-label="Buscar categorías"
              style={{ width: '100%', border: '1px solid var(--color-fog)', background: 'var(--color-paper)', borderRadius: '10px', padding: '9px 36px 9px 12px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
            />
            <Search size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-pebble)' }} />
          </div>
          <button
            type="button"
            onClick={openCreate}
            style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--color-lime-voltage)', color: 'var(--color-forest-ink)', border: 'none', borderRadius: '9999px', padding: '9px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', minHeight: '38px' }}
          >
            <Plus size={15} /> Nueva categoría
          </button>
        </div>

        {/* Banner */}
        {banner && (
          <div
            role={banner.type === 'error' ? 'alert' : 'status'}
            style={{ margin: '0 20px 12px 20px', background: banner.type === 'success' ? '#f0fdf4' : '#fef2f2', border: banner.type === 'success' ? '1px solid #bbf7d0' : '1px solid var(--color-alarm-red)', color: banner.type === 'success' ? '#166534' : '#991b1b', padding: '12px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, display: 'flex', gap: '8px', alignItems: 'center' }}
          >
            <span style={{ flex: 1 }}>{banner.text}</span>
            <button type="button" onClick={() => setBanner(null)} aria-label="Cerrar aviso" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 700 }}>
              ×
            </button>
          </div>
        )}

        {/* Selección */}
        {selected.length > 0 && (
          <div style={{ margin: '0 20px 12px 20px', display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--color-linen-mist)', border: '1px solid var(--color-forest-ink)', borderRadius: '10px', padding: '9px 14px', fontSize: '13px', fontWeight: 600, color: '#1d4ed8' }}>
            <span>{selected.length} seleccionada{selected.length === 1 ? '' : 's'}</span>
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
              style={{ background: confirmBulk ? 'var(--color-alarm-red)' : '#ffffff', color: confirmBulk ? '#ffffff' : 'var(--color-alarm-red)', border: '1px solid var(--color-alarm-red)', borderRadius: '6px', padding: '7px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
            >
              {confirmBulk ? `¿Confirmar borrado de ${selected.length}?` : `Eliminar (${selected.length})`}
            </button>
            <button type="button" onClick={() => { setSelected([]); setConfirmBulk(false); }} style={{ background: 'transparent', border: 'none', color: '#1d4ed8', fontSize: '12px', fontWeight: 600, cursor: 'pointer', marginLeft: 'auto' }}>
              Limpiar
            </button>
          </div>
        )}

        {/* Tabla */}
        <div style={{ overflowX: 'auto', margin: '0 20px 20px 20px', border: '1px solid var(--color-fog)', borderRadius: '10px' }}>
          <table style={{ width: '100%', minWidth: '860px', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-fog)', textAlign: 'left', background: 'var(--color-paper)' }}>
                <th style={{ padding: '12px 12px 12px 18px', width: '36px' }}>
                  <input type="checkbox" checked={items.length > 0 && items.every((i) => selected.includes(i.id))} onChange={() => setSelected((prev) => (items.every((i) => prev.includes(i.id)) ? prev.filter((s) => !items.some((i) => i.id === s)) : [...new Set([...prev, ...items.map((i) => i.id)])]))} aria-label="Seleccionar todas" style={{ accentColor: 'var(--color-forest-ink)', width: '15px', height: '15px', cursor: 'pointer' }} />
                </th>
                <th style={{ padding: '12px' }}>
                  <button type="button" onClick={() => setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--color-charcoal)', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: 0 }}>
                    NÚM. {sortOrder === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                </th>
                <th style={{ padding: '12px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--color-charcoal)' }}>NOMBRE</th>
                <th style={{ padding: '12px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--color-charcoal)' }}>DESCRIPCIÓN</th>
                <th style={{ padding: '12px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--color-charcoal)' }}>PRODUCTOS TOTALES</th>
                <th style={{ padding: '12px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--color-charcoal)' }}>SUBCATEGORÍAS TOTALES</th>
                <th style={{ padding: '12px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--color-charcoal)' }}>UMBRAL DE CADUCIDAD</th>
                <th style={{ padding: '12px 18px 12px 12px', textAlign: 'right', color: 'var(--color-forest-ink)' }}>
                  <Zap size={15} />
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: 'var(--color-pebble)' }}>
                    Cargando categorías…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '24px' }}>
                    <div style={{ border: '1px dashed var(--color-pebble)', borderRadius: '10px', background: 'var(--color-paper)', padding: '20px', fontSize: '14px', fontWeight: 600, color: 'var(--color-obsidian)', textAlign: 'center' }}>
                      {total === 0 && !hasFilters
                        ? 'No hay categorías para mostrar. Añade una nueva categoría con el botón Nueva categoría en la tabla de abajo.'
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
                        aria-label={`Seleccionar ${item.name}`}
                        style={{ accentColor: 'var(--color-forest-ink)', width: '15px', height: '15px', cursor: 'pointer' }}
                      />
                    </td>
                    <td style={{ padding: '12px', color: 'var(--color-slate)', fontVariantNumeric: 'tabular-nums' }}>
                      {(page - 1) * PAGE_SIZE + idx + 1}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <button
                        type="button"
                        onClick={() => openEdit(item)}
                        title={`Editar ${item.name}`}
                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}
                      >
                        <span style={{ display: 'block', fontWeight: 700, color: '#1d4ed8', fontSize: '13px' }}>{item.name}</span>
                        {item.parentName && (
                          <span style={{ display: 'block', fontSize: '11px', color: 'var(--color-pebble)' }}>↳ {item.parentName}</span>
                        )}
                      </button>
                    </td>
                    <td style={{ padding: '12px', color: 'var(--color-slate)', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.description}>
                      {item.description || '—'}
                    </td>
                    <td style={{ padding: '12px', fontWeight: 700, color: 'var(--color-obsidian)', fontVariantNumeric: 'tabular-nums' }}>
                      {item.productCount}
                    </td>
                    <td style={{ padding: '12px', color: 'var(--color-charcoal)', fontVariantNumeric: 'tabular-nums' }}>
                      {item.subCount}
                    </td>
                    <td style={{ padding: '12px', color: 'var(--color-charcoal)', whiteSpace: 'nowrap' }}>
                      {item.expiryDays !== null ? `${item.expiryDays} días` : '—'}
                      {item.taxRate !== null && (
                        <span style={{ display: 'block', fontSize: '11px', color: '#b45309' }}>IVA {item.taxRate}%</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 18px 12px 12px', textAlign: 'right' }}>
                      <button
                        type="button"
                        title={`Ver productos de ${item.name}`}
                        onClick={() => router.push(`/products/products?q=${encodeURIComponent(item.name)}`)}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0 20px 18px 20px', fontSize: '12px', color: 'var(--color-slate)' }}>
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

      {/* Modal crear/editar */}
      {showModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={editing ? 'Editar categoría' : 'Nueva categoría'}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 80, padding: '16px' }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !saving && !deleting) setShowModal(false);
          }}
        >
          <form
            onSubmit={handleSave}
            style={{ background: '#ffffff', borderRadius: '10px', padding: '24px', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--color-obsidian)', margin: 0, flex: 1 }}>
                {editing ? 'Editar categoría' : 'Nueva categoría'}
              </h2>
              <button type="button" onClick={() => !saving && !deleting && setShowModal(false)} aria-label="Cerrar" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-slate)', display: 'flex', minWidth: '44px', minHeight: '44px', alignItems: 'center', justifyContent: 'center' }}>
                <X size={18} />
              </button>
            </div>
            {formError && (
              <div role="alert" style={{ background: '#fef2f2', border: '1px solid var(--color-alarm-red)', color: '#991b1b', padding: '10px 12px', borderRadius: '10px', fontSize: '13px', fontWeight: 600 }}>
                {formError}
              </div>
            )}
            <label style={labelStyle}>
              Nombre *
              <input value={fName} onChange={(e) => setFName(e.target.value)} placeholder="Nombre de la categoría" required style={inputStyle} />
            </label>
            <label style={labelStyle}>
              Descripción
              <input value={fDescription} onChange={(e) => setFDescription(e.target.value)} placeholder="Descripción" style={inputStyle} />
            </label>
            <label style={labelStyle}>
              Categoría padre (opcional, la convierte en subcategoría)
              <select value={fParentId} onChange={(e) => setFParentId(e.target.value)} style={inputStyle}>
                <option value="">Ninguna (principal)</option>
                {allCategories
                  .filter((c) => !editing || c.id !== editing.id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <label style={labelStyle}>
                Tasa de impuesto % (opcional)
                <input value={fTaxRate} onChange={(e) => setFTaxRate(e.target.value)} placeholder="18" inputMode="decimal" style={inputStyle} />
              </label>
              <label style={labelStyle}>
                Umbral caducidad (días, opcional)
                <input value={fExpiry} onChange={(e) => setFExpiry(e.target.value)} placeholder="30" inputMode="numeric" style={inputStyle} />
              </label>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
              {editing && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={saving || deleting}
                  style={{ background: '#ffffff', color: 'var(--color-alarm-red)', border: '1px solid var(--color-alarm-red)', borderRadius: '9999px', padding: '9px 16px', fontSize: '13px', fontWeight: 600, cursor: saving || deleting ? 'not-allowed' : 'pointer', minHeight: '44px' }}
                >
                  {deleting ? 'Eliminando…' : 'Eliminar'}
                </button>
              )}
              <span style={{ marginLeft: 'auto', display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => !saving && !deleting && setShowModal(false)} style={{ background: '#ffffff', border: '1px solid var(--color-pebble)', borderRadius: '9999px', padding: '9px 16px', fontSize: '13px', fontWeight: 600, color: 'var(--color-charcoal)', cursor: saving || deleting ? 'not-allowed' : 'pointer', minHeight: '44px' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={saving || deleting} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: saving ? 'var(--color-pebble)' : 'var(--color-forest-ink)', color: '#ffffff', border: 'none', borderRadius: '9999px', padding: '9px 16px', fontSize: '13px', fontWeight: 600, cursor: saving || deleting ? 'not-allowed' : 'pointer', minHeight: '44px' }}>
                  {saving && <Loader2 size={15} style={{ animation: 'inventa-spin 1s linear infinite' }} />}
                  {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear categoría'}
                </button>
              </span>
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
