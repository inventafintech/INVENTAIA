'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Store,
  Search,
  SlidersHorizontal,
  Plus,
  Zap,
  ChevronUp,
  ChevronDown,
  X,
  Loader2,
} from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';

import { apiFetch } from '@/lib/apiFetch';
interface SupplierItem {
  id: string;
  ref: string;
  name: string;
  branch: string;
  address: string;
  city: string;
  status: string;
  country: string;
  email: string;
  phone: string;
  leadTimeDays: number;
  type: 'corporate' | 'traditional';
}

const PAGE_SIZE = 10;

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  Confiable: { bg: '#f0fdf4', color: '#15803d' },
  Excelente: { bg: 'var(--color-linen-mist)', color: '#1d4ed8' },
  'En observación': { bg: '#fffbeb', color: '#b45309' },
};

function statusStyle(status: string) {
  return STATUS_STYLE[status] || { bg: 'var(--color-fog)', color: 'var(--color-charcoal)' };
}

export default function VendorsIndex() {
  const router = useRouter();
  const [items, setItems] = useState<SupplierItem[]>([]);
  const [kpis, setKpis] = useState({ total: 0, withBranch: 0, cities: 0, countries: 0 });
  const [countries, setCountries] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const [country, setCountry] = useState('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmBulk, setConfirmBulk] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<SupplierItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [fName, setFName] = useState('');
  const [fEmail, setFEmail] = useState('');
  const [fPhone, setFPhone] = useState('');
  const [fBranch, setFBranch] = useState('Sede Lima Central');
  const [fAddress, setFAddress] = useState('');
  const [fCity, setFCity] = useState('Lima');
  const [fCountry, setFCountry] = useState('Perú');
  const [fStatus, setFStatus] = useState('Confiable');
  const [fType, setFType] = useState('traditional');
  const [fLeadTime, setFLeadTime] = useState('5');

  const debouncedQuery = useDebounce(query, 300);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        q: debouncedQuery.trim(),
        type,
        country,
        order: sortOrder,
        page: String(page),
        pageSize: String(PAGE_SIZE),
      });
      const res = await apiFetch(`/api/suppliers?${params.toString()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        setTotal(data.total || 0);
        setKpis(data.kpis || { total: 0, withBranch: 0, cities: 0, countries: 0 });
        if (data.countries) setCountries(data.countries);
        setSelected((prev) => prev.filter((id) => (data.items || []).some((i: SupplierItem) => i.id === id)));
      }
    } catch (err) {
      console.error('Error al cargar proveedores:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, type, country, sortOrder, page]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, type, country]);

  useEffect(() => {
    if (selected.length === 0) setConfirmBulk(false);
  }, [selected]);

  const openCreate = () => {
    setEditing(null);
    setFName('');
    setFEmail('');
    setFPhone('');
    setFBranch('Sede Lima Central');
    setFAddress('');
    setFCity('Lima');
    setFCountry('Perú');
    setFStatus('Confiable');
    setFType('traditional');
    setFLeadTime('5');
    setFormError(null);
    setShowModal(true);
  };

  const openEdit = (item: SupplierItem) => {
    setEditing(item);
    setFName(item.name);
    setFEmail(item.email);
    setFPhone(item.phone);
    setFBranch(item.branch);
    setFAddress(item.address);
    setFCity(item.city);
    setFCountry(item.country);
    setFStatus(item.status);
    setFType(item.type);
    setFLeadTime(String(item.leadTimeDays));
    setFormError(null);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      const payload = {
        name: fName,
        email: fEmail,
        phone: fPhone,
        branch: fBranch,
        address: fAddress,
        city: fCity,
        country: fCountry,
        status: fStatus,
        type: fType,
        leadTime: fLeadTime === '' ? 5 : Number(fLeadTime),
      };
      let res: Response;
      if (editing) {
        res = await apiFetch(`/api/suppliers/${encodeURIComponent(editing.id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await apiFetch('/api/suppliers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'No se pudo guardar.');
      setShowModal(false);
      setBanner({ type: 'success', text: editing ? `Proveedor ${data.item?.ref || ''} actualizado.` : `Proveedor ${data.item?.ref || ''} creado.` });
      fetchSuppliers();
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
      const res = await apiFetch(`/api/suppliers/${encodeURIComponent(editing.id)}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'No se pudo eliminar.');
      setShowModal(false);
      setBanner({ type: 'success', text: 'Proveedor eliminado.' });
      fetchSuppliers();
    } catch (err: any) {
      setFormError(err?.message || 'No se pudo eliminar.');
    } finally {
      setDeleting(false);
    }
  };

  const allSelected = items.length > 0 && items.every((i) => selected.includes(i.id));

  const handleBulkDelete = async () => {
    if (selected.length === 0) return;
    setBanner(null);
    let ok = 0;
    let blocked = 0;
    for (const id of selected) {
      try {
        const res = await apiFetch(`/api/suppliers/${encodeURIComponent(id)}`, { method: 'DELETE' });
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
        ? `Se eliminaron ${ok} proveedores.${blocked > 0 ? ` ${blocked} tienen órdenes asociadas.` : ''}`
        : 'No se pudo eliminar la selección (revise órdenes asociadas).',
    });
    fetchSuppliers();
  };

  const kpiCards = [
    { label: 'PROVEEDORES TOTALES', value: String(kpis.total), caption: 'Cuentas de proveedores' },
    { label: 'CON RAMAS', value: String(kpis.withBranch), caption: 'Proveedores con info de sucursal' },
    { label: 'CIUDADES', value: String(kpis.cities), caption: 'Ubicaciones únicas por ciudad' },
    { label: 'PAÍSES', value: String(kpis.countries), caption: 'Países de operación' },
  ];

  const hasFilters = debouncedQuery.trim() !== '' || type !== 'all' || country !== 'all';
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(total, page * PAGE_SIZE);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Header */}
      <div style={{ background: '#ffffff', border: '1px solid var(--color-fog)', borderRadius: '10px', padding: '20px 22px', display: 'flex', alignItems: 'center', gap: '14px' }}>
        <span style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'var(--color-fog)', border: '1px solid var(--color-fog)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-charcoal)', flexShrink: 0 }}>
          <Store size={20} />
        </span>
        <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-obsidian)', margin: 0 }}>Proveedores</h1>
      </div>

      <span style={{ fontSize: '13px', color: 'var(--color-slate)' }}>
        Gestión de proveedores ({kpis.total} vendedor{kpis.total === 1 ? '' : 'es'})
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
            placeholder="Buscar por nombre, referencia o correo..."
            aria-label="Buscar proveedores"
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
            style={{ border: '1px solid var(--color-fog)', background: type !== 'all' || country !== 'all' ? 'var(--color-linen-mist)' : '#ffffff', borderRadius: '9999px', padding: '9px 12px', cursor: 'pointer', color: 'var(--color-charcoal)', display: 'flex', minHeight: '38px', alignItems: 'center' }}
          >
            <SlidersHorizontal size={16} />
          </button>
          {showFilters && (
            <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', background: '#ffffff', border: '1px solid var(--color-fog)', borderRadius: '10px', boxShadow: '0 12px 32px -8px rgba(15,23,42,0.18)', padding: '12px', zIndex: 50, minWidth: '220px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-charcoal)' }}>
                TIPO
                <select value={type} onChange={(e) => setType(e.target.value)} style={{ display: 'block', width: '100%', marginTop: '4px', padding: '8px', borderRadius: '6px', border: '1px solid var(--color-pebble)', fontSize: '13px' }}>
                  <option value="all">Todos</option>
                  <option value="corporate">Corporativo</option>
                  <option value="traditional">Tradicional</option>
                </select>
              </label>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-charcoal)' }}>
                PAÍS
                <select value={country} onChange={(e) => setCountry(e.target.value)} style={{ display: 'block', width: '100%', marginTop: '4px', padding: '8px', borderRadius: '6px', border: '1px solid var(--color-pebble)', fontSize: '13px' }}>
                  <option value="all">Todos</option>
                  {countries.map((c) => (
                    <option key={c} value={c}>
                      {c}
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
          <Plus size={15} /> Nuevo Proveedor
        </button>
      </div>

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
      <div style={{ background: '#ffffff', border: '1px solid var(--color-fog)', borderRadius: '10px', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: '900px', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-fog)', textAlign: 'left' }}>
                <th style={{ padding: '12px 12px 12px 18px', width: '36px' }}>
                  <input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? [] : items.map((i) => i.id))} aria-label="Seleccionar todos" style={{ accentColor: 'var(--color-forest-ink)', width: '15px', height: '15px', cursor: 'pointer' }} />
                </th>
                <th style={{ padding: '12px' }}>
                  <button type="button" onClick={() => setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--color-charcoal)', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: 0 }}>
                    REFERENCIA {sortOrder === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                </th>
                <th style={{ padding: '12px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--color-charcoal)' }}>NOMBRE</th>
                <th style={{ padding: '12px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--color-charcoal)' }}>NOMBRE DE SUCURSAL</th>
                <th style={{ padding: '12px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--color-charcoal)' }}>DIRECCIÓN</th>
                <th style={{ padding: '12px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--color-charcoal)' }}>CIUDAD</th>
                <th style={{ padding: '12px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--color-charcoal)' }}>ESTADO</th>
                <th style={{ padding: '12px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--color-charcoal)' }}>PAÍS</th>
                <th style={{ padding: '12px 18px 12px 12px', textAlign: 'right', color: 'var(--color-forest-ink)' }}>
                  <Zap size={15} />
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ padding: '32px', textAlign: 'center', color: 'var(--color-pebble)' }}>
                    Cargando proveedores…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: 0 }}>
                    <div style={{ margin: '12px', border: '1px solid var(--color-fog)', borderLeft: '3px solid var(--color-forest-ink)', borderRadius: '10px', background: 'var(--color-paper)', padding: '14px 16px', fontSize: '13px', color: 'var(--color-obsidian)' }}>
                      {total === 0 && !hasFilters
                        ? 'No hay proveedores para mostrar. Añade un nuevo proveedor haciendo clic en NUEVO PROVEEDOR arriba.'
                        : 'Sin coincidencias para los filtros aplicados.'}
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const st = statusStyle(item.status);
                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--color-fog)' }}>
                      <td style={{ padding: '12px 12px 12px 18px' }}>
                        <input
                          type="checkbox"
                          checked={selected.includes(item.id)}
                          onChange={() => setSelected((prev) => (prev.includes(item.id) ? prev.filter((s) => s !== item.id) : [...prev, item.id]))}
                          aria-label={`Seleccionar ${item.ref}`}
                          style={{ accentColor: 'var(--color-forest-ink)', width: '15px', height: '15px', cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ padding: '12px', fontWeight: 700, color: 'var(--color-obsidian)', whiteSpace: 'nowrap', fontSize: '12px' }}>{item.ref}</td>
                      <td style={{ padding: '12px' }}>
                        <button
                          type="button"
                          onClick={() => openEdit(item)}
                          title={`Editar ${item.name}`}
                          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#1d4ed8', fontWeight: 600, fontSize: '13px', textAlign: 'left' }}
                        >
                          {item.name}
                        </button>
                      </td>
                      <td style={{ padding: '12px', color: 'var(--color-charcoal)', whiteSpace: 'nowrap' }}>{item.branch || '—'}</td>
                      <td style={{ padding: '12px', color: 'var(--color-slate)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.address}>
                        {item.address || '—'}
                      </td>
                      <td style={{ padding: '12px', color: 'var(--color-charcoal)', whiteSpace: 'nowrap' }}>{item.city || '—'}</td>
                      <td style={{ padding: '12px', whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '999px', background: st.bg, color: st.color }}>
                          {item.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px', color: 'var(--color-charcoal)', whiteSpace: 'nowrap' }}>{item.country || '—'}</td>
                      <td style={{ padding: '12px 18px 12px 12px', textAlign: 'right' }}>
                        <button
                          type="button"
                          title={`Ver trazabilidad de ${item.name}`}
                          onClick={() => router.push(`/activity-log?q=${encodeURIComponent(item.name)}`)}
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-forest-ink)', display: 'inline-flex' }}
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
          aria-label={editing ? 'Editar proveedor' : 'Nuevo proveedor'}
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
                {editing ? `Editar ${editing.ref}` : 'Nuevo Proveedor'}
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
              <input value={fName} onChange={(e) => setFName(e.target.value)} placeholder="Razón social del proveedor" required style={inputStyle} />
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <label style={labelStyle}>
                Correo
                <input value={fEmail} onChange={(e) => setFEmail(e.target.value)} placeholder="contacto@empresa.com" style={inputStyle} />
              </label>
              <label style={labelStyle}>
                Teléfono
                <input value={fPhone} onChange={(e) => setFPhone(e.target.value)} placeholder="+51 ..." style={inputStyle} />
              </label>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <label style={labelStyle}>
                Sucursal
                <input value={fBranch} onChange={(e) => setFBranch(e.target.value)} placeholder="Sede Lima Central" style={inputStyle} />
              </label>
              <label style={labelStyle}>
                Dirección
                <input value={fAddress} onChange={(e) => setFAddress(e.target.value)} placeholder="Dirección fiscal" style={inputStyle} />
              </label>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <label style={labelStyle}>
                Ciudad
                <input value={fCity} onChange={(e) => setFCity(e.target.value)} placeholder="Lima" style={inputStyle} />
              </label>
              <label style={labelStyle}>
                País
                <input value={fCountry} onChange={(e) => setFCountry(e.target.value)} placeholder="Perú" style={inputStyle} />
              </label>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <label style={labelStyle}>
                Estado
                <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} style={inputStyle}>
                  <option value="Confiable">Confiable</option>
                  <option value="Excelente">Excelente</option>
                  <option value="En observación">En observación</option>
                </select>
              </label>
              <label style={labelStyle}>
                Tipo
                <select value={fType} onChange={(e) => setFType(e.target.value)} style={inputStyle}>
                  <option value="traditional">Tradicional</option>
                  <option value="corporate">Corporativo</option>
                </select>
              </label>
              <label style={labelStyle}>
                Lead time (días)
                <input value={fLeadTime} onChange={(e) => setFLeadTime(e.target.value)} inputMode="numeric" style={inputStyle} />
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
                  {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear proveedor'}
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
