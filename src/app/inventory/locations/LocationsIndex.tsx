'use client';

import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Search,
  SlidersHorizontal,
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  X,
  Loader2,
} from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';

interface LocationItem {
  ref: string;
  name: string;
  status: 'disponible' | 'entrante' | 'cuarentena' | 'desecho';
  storageType: string;
  branch: string;
  description: string;
  area: string;
}

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  disponible: { label: 'Disponible', color: '#15803d', bg: '#f0fdf4' },
  entrante: { label: 'Entrante', color: 'var(--color-forest-ink)', bg: 'var(--color-linen-mist)' },
  cuarentena: { label: 'Cuarentena', color: '#d97706', bg: '#fffbeb' },
  desecho: { label: 'Desecho', color: 'var(--color-alarm-red)', bg: '#fef2f2' },
};

const PAGE_SIZE = 10;

export default function LocationsIndex() {
  const [items, setItems] = useState<LocationItem[]>([]);
  const [kpis, setKpis] = useState({ total: 0, branches: 0, storageTypes: 0, available: 0, availablePct: 0 });
  const [branches, setBranches] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [branch, setBranch] = useState('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<LocationItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [fRef, setFRef] = useState('');
  const [fName, setFName] = useState('');
  const [fStatus, setFStatus] = useState('disponible');
  const [fStorageType, setFStorageType] = useState('General');
  const [fBranch, setFBranch] = useState('Sucursal Principal');
  const [fDescription, setFDescription] = useState('');
  const [fArea, setFArea] = useState('');

  const debouncedQuery = useDebounce(query, 300);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchLocations = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        q: debouncedQuery.trim(),
        status,
        branch,
        order: sortOrder,
        page: String(page),
        pageSize: String(PAGE_SIZE),
      });
      const res = await fetch(`/api/locations?${params.toString()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        setTotal(data.total || 0);
        setKpis(data.kpis || { total: 0, branches: 0, storageTypes: 0, available: 0, availablePct: 0 });
        if (data.branches) setBranches(data.branches);
        setSelected((prev) => prev.filter((ref) => (data.items || []).some((i: LocationItem) => i.ref === ref)));
      }
    } catch (err) {
      console.error('Error al cargar ubicaciones:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, status, branch, sortOrder, page]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, status, branch]);

  useEffect(() => {
    if (selected.length === 0) setConfirmBulk(false);
  }, [selected]);

  useEffect(() => {
    if (!openMenu) return;
    const close = () => {
      setOpenMenu(null);
      setConfirmDelete(null);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [openMenu]);

  const openCreate = () => {
    setEditing(null);
    setFRef('');
    setFName('');
    setFStatus('disponible');
    setFStorageType('General');
    setFBranch('Sucursal Principal');
    setFDescription('');
    setFArea('');
    setFormError(null);
    setShowModal(true);
  };

  const openEdit = (item: LocationItem) => {
    setEditing(item);
    setFRef(item.ref);
    setFName(item.name);
    setFStatus(item.status);
    setFStorageType(item.storageType);
    setFBranch(item.branch);
    setFDescription(item.description);
    setFArea(item.area);
    setFormError(null);
    setShowModal(true);
    setOpenMenu(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: fName,
        status: fStatus,
        storageType: fStorageType,
        branch: fBranch,
        description: fDescription,
        area: fArea,
      };
      let res: Response;
      if (editing) {
        res = await fetch(`/api/locations/${encodeURIComponent(editing.ref)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        if (fRef.trim()) payload.ref = fRef;
        res = await fetch('/api/locations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'No se pudo guardar.');
      setShowModal(false);
      setBanner({ type: 'success', text: editing ? `Ubicación ${editing.ref} actualizada.` : `Ubicación ${data.item?.ref || ''} creada.` });
      fetchLocations();
    } catch (err: any) {
      setFormError(err?.message || 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (ref: string) => {
    try {
      const res = await fetch(`/api/locations/${encodeURIComponent(ref)}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'No se pudo eliminar.');
      setBanner({ type: 'success', text: `Ubicación ${ref} eliminada.` });
      setSelected((prev) => prev.filter((s) => s !== ref));
      fetchLocations();
    } catch (err: any) {
      setBanner({ type: 'error', text: err?.message || 'No se pudo eliminar.' });
    } finally {
      setOpenMenu(null);
      setConfirmDelete(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selected.length === 0) return;
    setBanner(null);
    let ok = 0;
    for (const ref of selected) {
      try {
        const res = await fetch(`/api/locations/${encodeURIComponent(ref)}`, { method: 'DELETE' });
        if (res.ok) ok++;
      } catch {
        // continuar con el resto
      }
    }
    setSelected([]);
    setBanner({
      type: ok === selected.length && ok > 0 ? 'success' : 'error',
      text: ok > 0 ? `Se eliminaron ${ok} ubicaciones.` : 'No se pudo eliminar la selección.',
    });
    fetchLocations();
  };

  const kpiCards = [
    { label: 'UBICACIONES TOTALES', value: String(kpis.total), caption: 'Ubicaciones de almacenamiento', bar: null as number | null },
    { label: 'SUCURSALES', value: String(kpis.branches), caption: 'Ubicaciones entre sucursales', bar: null },
    { label: 'TIPOS DE ALMACENAMIENTO', value: String(kpis.storageTypes), caption: 'Diferentes tipos de almacenamiento', bar: null },
    { label: 'UBICACIONES DISPONIBLES', value: `${kpis.available}`, caption: 'Listo para almacenamiento', bar: kpis.availablePct, suffix: ` ${kpis.availablePct}%` },
  ];

  const hasFilters = debouncedQuery.trim() !== '' || status !== 'all' || branch !== 'all';
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(total, page * PAGE_SIZE);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Header */}
      <div style={{ background: '#ffffff', border: '1px solid var(--color-fog)', borderRadius: '10px', padding: '20px 22px', display: 'flex', alignItems: 'center', gap: '14px' }}>
        <span style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'var(--color-fog)', border: '1px solid var(--color-fog)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-charcoal)', flexShrink: 0 }}>
          <MapPin size={20} />
        </span>
        <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-obsidian)', margin: 0 }}>Ubicaciones</h1>
      </div>

      <span style={{ fontSize: '13px', color: 'var(--color-slate)' }}>
        Gestión de ubicaciones de almacenamiento ({kpis.total} ubicacion{kpis.total === 1 ? '' : 'es'})
      </span>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', background: '#ffffff', border: '1px solid var(--color-fog)', borderRadius: '10px', overflow: 'hidden' }}>
        {kpiCards.map((k, idx) => (
          <div key={k.label} style={{ padding: '18px 20px', borderLeft: idx === 0 ? 'none' : '1px solid var(--color-fog)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--color-charcoal)' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--color-forest-ink)' }} />
              {k.label}
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-obsidian)', marginTop: '6px', fontVariantNumeric: 'tabular-nums' }}>
              {k.value}
              {k.suffix && <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--color-pebble)' }}>{k.suffix}</span>}
            </div>
            {k.bar !== null && (
              <div style={{ height: '3px', background: 'var(--color-fog)', borderRadius: '999px', marginTop: '10px', overflow: 'hidden' }}>
                <div style={{ width: `${k.bar}%`, height: '100%', background: 'var(--color-forest-ink)', borderRadius: '999px' }} />
              </div>
            )}
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
            placeholder="Buscar por referencia, nombre o descripción..."
            aria-label="Buscar ubicaciones"
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
            style={{ border: '1px solid var(--color-fog)', background: status !== 'all' || branch !== 'all' ? 'var(--color-linen-mist)' : '#ffffff', borderRadius: '9999px', padding: '9px 12px', cursor: 'pointer', color: 'var(--color-charcoal)', display: 'flex', minHeight: '38px', alignItems: 'center' }}
          >
            <SlidersHorizontal size={16} />
          </button>
          {showFilters && (
            <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', background: '#ffffff', border: '1px solid var(--color-fog)', borderRadius: '10px', boxShadow: '0 12px 32px -8px rgba(15,23,42,0.18)', padding: '12px', zIndex: 50, minWidth: '220px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-charcoal)' }}>
                ESTADO
                <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ display: 'block', width: '100%', marginTop: '4px', padding: '8px', borderRadius: '6px', border: '1px solid var(--color-pebble)', fontSize: '13px' }}>
                  <option value="all">Todos</option>
                  <option value="disponible">Disponible</option>
                  <option value="entrante">Entrante</option>
                  <option value="cuarentena">Cuarentena</option>
                  <option value="desecho">Desecho</option>
                </select>
              </label>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-charcoal)' }}>
                SUCURSAL
                <select value={branch} onChange={(e) => setBranch(e.target.value)} style={{ display: 'block', width: '100%', marginTop: '4px', padding: '8px', borderRadius: '6px', border: '1px solid var(--color-pebble)', fontSize: '13px' }}>
                  <option value="all">Todas</option>
                  {branches.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
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
          <Plus size={15} /> Nueva ubicación
        </button>
      </div>

      {/* Selección */}
      {selected.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--color-linen-mist)', border: '1px solid var(--color-forest-ink)', borderRadius: '10px', padding: '9px 14px', fontSize: '13px', fontWeight: 600, color: '#1d4ed8' }}>
          <span>{selected.length} seleccionada{selected.length === 1 ? '' : 's'}</span>
          <button
            type="button"
            onClick={() => {
              if (selected.length === 1) {
                setConfirmDelete(selected[0]);
                setOpenMenu(selected[0]);
              } else if (!confirmBulk) {
                setConfirmBulk(true);
              } else {
                setConfirmBulk(false);
                handleBulkDelete();
              }
            }}
            style={{ background: confirmBulk && selected.length > 1 ? 'var(--color-alarm-red)' : '#ffffff', color: confirmBulk && selected.length > 1 ? '#ffffff' : 'var(--color-alarm-red)', border: '1px solid var(--color-alarm-red)', borderRadius: '6px', padding: '7px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
          >
            {confirmBulk && selected.length > 1 ? `¿Confirmar borrado de ${selected.length}?` : `Eliminar (${selected.length})`}
          </button>
          <button type="button" onClick={() => { setSelected([]); setConfirmBulk(false); }} style={{ background: 'transparent', border: 'none', color: '#1d4ed8', fontSize: '12px', fontWeight: 600, cursor: 'pointer', marginLeft: 'auto' }}>
            Limpiar
          </button>
        </div>
      )}

      {/* Tabla */}
      <div style={{ background: '#ffffff', border: '1px solid var(--color-fog)', borderRadius: '10px', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: '880px', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-fog)', textAlign: 'left' }}>
                <th style={{ padding: '12px 12px 12px 18px', width: '36px' }}>
                  <input type="checkbox" checked={items.length > 0 && items.every((i) => selected.includes(i.ref))} onChange={() => setSelected((prev) => (items.every((i) => prev.includes(i.ref)) ? prev.filter((s) => !items.some((i) => i.ref === s)) : [...new Set([...prev, ...items.map((i) => i.ref)])]))} aria-label="Seleccionar todas" style={{ accentColor: 'var(--color-forest-ink)', width: '15px', height: '15px', cursor: 'pointer' }} />
                </th>
                <th style={{ padding: '12px' }}>
                  <button type="button" onClick={() => setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--color-charcoal)', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: 0 }}>
                    REFERENCIA {sortOrder === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                </th>
                <th style={{ padding: '12px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--color-charcoal)' }}>TIPO</th>
                <th style={{ padding: '12px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--color-charcoal)' }}>NOMBRE</th>
                <th style={{ padding: '12px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--color-charcoal)' }}>TIPO DE ALMACENAMIENTO</th>
                <th style={{ padding: '12px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--color-charcoal)' }}>SUCURSAL</th>
                <th style={{ padding: '12px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--color-charcoal)' }}>DESCRIPCIÓN</th>
                <th style={{ padding: '12px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--color-charcoal)' }}>ÁREA</th>
                <th style={{ padding: '12px 18px 12px 12px', width: '44px' }} />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ padding: '32px', textAlign: 'center', color: 'var(--color-pebble)' }}>
                    Cargando ubicaciones…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: 0 }}>
                    <div style={{ margin: '12px', border: '1px solid var(--color-fog)', borderLeft: '3px solid var(--color-forest-ink)', borderRadius: '10px', background: 'var(--color-paper)', padding: '14px 16px', fontSize: '13px', color: 'var(--color-obsidian)' }}>
                      {total === 0 && !hasFilters
                        ? 'No hay ubicaciones registradas. Crea la primera con NUEVA UBICACIÓN arriba.'
                        : 'Sin coincidencias para los filtros aplicados.'}
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const meta = STATUS_META[item.status] || STATUS_META.disponible;
                  return (
                    <tr key={item.ref} style={{ borderBottom: '1px solid var(--color-fog)', borderLeft: `3px solid ${meta.color}` }}>
                      <td style={{ padding: '12px 12px 12px 18px' }}>
                        <input
                          type="checkbox"
                          checked={selected.includes(item.ref)}
                          onChange={() => setSelected((prev) => (prev.includes(item.ref) ? prev.filter((s) => s !== item.ref) : [...prev, item.ref]))}
                          aria-label={`Seleccionar ${item.ref}`}
                          style={{ accentColor: 'var(--color-forest-ink)', width: '15px', height: '15px', cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ padding: '12px', fontWeight: 600, color: 'var(--color-charcoal)', whiteSpace: 'nowrap', fontSize: '12px' }}>{item.ref}</td>
                      <td style={{ padding: '12px', whiteSpace: 'nowrap' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--color-obsidian)' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: meta.color }} />
                          {meta.label}
                        </span>
                      </td>
                      <td style={{ padding: '12px', fontWeight: 700, color: 'var(--color-obsidian)', whiteSpace: 'nowrap' }}>{item.name}</td>
                      <td style={{ padding: '12px', color: 'var(--color-charcoal)', whiteSpace: 'nowrap' }}>{item.storageType || '—'}</td>
                      <td style={{ padding: '12px', color: 'var(--color-charcoal)', whiteSpace: 'nowrap' }}>{item.branch}</td>
                      <td style={{ padding: '12px', color: 'var(--color-slate)', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.description}>
                        {item.description || '—'}
                      </td>
                      <td style={{ padding: '12px', color: 'var(--color-charcoal)', whiteSpace: 'nowrap' }}>{item.area || '—'}</td>
                      <td style={{ padding: '12px 18px 12px 12px', position: 'relative' }}>
                        <button
                          type="button"
                          aria-label={`Acciones para ${item.ref}`}
                          aria-expanded={openMenu === item.ref}
                          onClick={() => {
                            setConfirmDelete(null);
                            setOpenMenu((v) => (v === item.ref ? null : item.ref));
                          }}
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-slate)', display: 'flex', minWidth: '44px', minHeight: '44px', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <MoreVertical size={16} />
                        </button>
                        {openMenu === item.ref && (
                          <div style={{ position: 'absolute', right: '12px', top: 'calc(100% - 6px)', background: '#ffffff', border: '1px solid var(--color-fog)', borderRadius: '10px', boxShadow: '0 12px 32px -8px rgba(15,23,42,0.25)', zIndex: 60, minWidth: '180px', padding: '6px' }}>
                            {confirmDelete === item.ref ? (
                              <div style={{ padding: '8px' }}>
                                <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-obsidian)', margin: '0 0 8px 0' }}>
                                  ¿Eliminar {item.ref}?
                                </p>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <button type="button" onClick={() => handleDelete(item.ref)} style={{ flex: 1, background: 'var(--color-alarm-red)', color: '#ffffff', border: 'none', borderRadius: '6px', padding: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', minHeight: '44px' }}>
                                    Sí, eliminar
                                  </button>
                                  <button type="button" onClick={() => setConfirmDelete(null)} style={{ flex: 1, background: '#ffffff', color: 'var(--color-charcoal)', border: '1px solid var(--color-pebble)', borderRadius: '6px', padding: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', minHeight: '44px' }}>
                                    No
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <button type="button" onClick={() => openEdit(item)} style={menuBtnStyle}>
                                  <Pencil size={14} /> Editar
                                </button>
                                <button type="button" onClick={() => setConfirmDelete(item.ref)} style={{ ...menuBtnStyle, color: 'var(--color-alarm-red)' }}>
                                  <Trash2 size={14} /> Eliminar
                                </button>
                              </>
                            )}
                          </div>
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

      {/* Modal crear/editar */}
      {showModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={editing ? 'Editar ubicación' : 'Nueva ubicación'}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 80, padding: '16px' }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !saving) setShowModal(false);
          }}
        >
          <form
            onSubmit={handleSave}
            style={{ background: '#ffffff', borderRadius: '10px', padding: '24px', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--color-obsidian)', margin: 0, flex: 1 }}>
                {editing ? `Editar ${editing.ref}` : 'Nueva ubicación'}
              </h2>
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
              {!editing && (
                <label style={labelStyle}>
                  Referencia (auto)
                  <input value={fRef} onChange={(e) => setFRef(e.target.value.toUpperCase())} placeholder="LOC-00005" style={inputStyle} />
                </label>
              )}
              <label style={labelStyle}>
                Estado
                <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} style={inputStyle}>
                  <option value="disponible">Disponible</option>
                  <option value="entrante">Entrante</option>
                  <option value="cuarentena">Cuarentena</option>
                  <option value="desecho">Desecho</option>
                </select>
              </label>
            </div>
            <label style={labelStyle}>
              Nombre *
              <input value={fName} onChange={(e) => setFName(e.target.value)} placeholder="Nombre de la ubicación" required style={inputStyle} />
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <label style={labelStyle}>
                Tipo de almacenamiento
                <input value={fStorageType} onChange={(e) => setFStorageType(e.target.value)} placeholder="General" style={inputStyle} />
              </label>
              <label style={labelStyle}>
                Sucursal
                <input value={fBranch} onChange={(e) => setFBranch(e.target.value)} placeholder="Sucursal Principal" style={inputStyle} />
              </label>
            </div>
            <label style={labelStyle}>
              Descripción
              <input value={fDescription} onChange={(e) => setFDescription(e.target.value)} placeholder="Descripción" style={inputStyle} />
            </label>
            <label style={labelStyle}>
              Área
              <input value={fArea} onChange={(e) => setFArea(e.target.value)} placeholder="Nave A" style={inputStyle} />
            </label>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
              <button type="button" onClick={() => !saving && setShowModal(false)} style={{ background: '#ffffff', border: '1px solid var(--color-pebble)', borderRadius: '9999px', padding: '9px 16px', fontSize: '13px', fontWeight: 600, color: 'var(--color-charcoal)', cursor: saving ? 'not-allowed' : 'pointer', minHeight: '44px' }}>
                Cancelar
              </button>
              <button type="submit" disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: saving ? 'var(--color-pebble)' : 'var(--color-forest-ink)', color: '#ffffff', border: 'none', borderRadius: '9999px', padding: '9px 16px', fontSize: '13px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', minHeight: '44px' }}>
                {saving && <Loader2 size={15} style={{ animation: 'inventa-spin 1s linear infinite' }} />}
                {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear ubicación'}
              </button>
            </div>
          </form>
        </div>
      )}
      <style>{`@keyframes inventa-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const menuBtnStyle: React.CSSProperties = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  background: 'transparent',
  border: 'none',
  borderRadius: '6px',
  padding: '10px 12px',
  fontSize: '13px',
  fontWeight: 600,
  color: 'var(--color-obsidian)',
  cursor: 'pointer',
  minHeight: '44px',
  textAlign: 'left',
};

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
