'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  Building2,
  Plus,
  X,
  Loader2,
  MapPin,
  Save,
} from 'lucide-react';
import styles from './BranchDetails.module.css';

import { apiFetch } from '@/lib/apiFetch';
interface BranchProfile {
  code: string;
  name: string;
  company: string;
  nif: string;
  fiscalStart: string;
  contact: { person: string; phone: string; email: string };
  address: { line1: string; line2: string; district: string; city: string; state: string; postal: string; country: string };
  departments: Array<{ id: string; name: string }>;
}

interface BranchPayload {
  branch: BranchProfile;
  locationsCount: number;
  departmentsCount: number;
  updatedAt: string;
}

const COUNTRIES = [
  'Perú', 'Colombia', 'Ecuador', 'Chile', 'México', 'Argentina', 'Brasil',
  'Bolivia', 'Paraguay', 'Uruguay', 'Venezuela', 'Panamá', 'Costa Rica',
  'Estados Unidos', 'España', 'Otro',
];

const EMPTY_BRANCH: BranchProfile = {
  code: '',
  name: '',
  company: '',
  nif: '',
  fiscalStart: '',
  contact: { person: '', phone: '', email: '' },
  address: { line1: '', line2: '', district: '', city: '', state: '', postal: '', country: 'Perú' },
  departments: [],
};

function formatDateEs(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function BranchDetailsView() {
  const router = useRouter();
  const [data, setData] = useState<BranchPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'resumen' | 'ubicaciones'>('resumen');
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [form, setForm] = useState<BranchProfile>(EMPTY_BRANCH);
  const [newDept, setNewDept] = useState('');
  const [locations, setLocations] = useState<Array<{ ref: string; name: string; code?: string; zone?: string; branch?: string }>>([]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/branch', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setForm(json.branch);
      }
    } catch (err) {
      console.error('Error al cargar sucursal:', err);
    } finally {
      setLoading(false);
    }
    try {
      const res = await apiFetch('/api/locations?pageSize=50', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        setLocations(json.items || []);
      }
    } catch {
      // La pestaña muestra estado vacío si falla
    }
  };

  useEffect(() => {
    load();
  }, []);

  const setField = (section: 'contact' | 'address', key: string, value: string) => {
    setForm((prev) => ({ ...prev, [section]: { ...prev[section], [key]: value } }));
  };

  const addDepartment = () => {
    const name = newDept.trim();
    if (!name) return;
    setForm((prev) => ({
      ...prev,
      departments: [...prev.departments, { id: `dep-local-${Date.now()}`, name }],
    }));
    setNewDept('');
  };

  const removeDepartment = (id: string) => {
    setForm((prev) => ({ ...prev, departments: prev.departments.filter((d) => d.id !== id) }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setBanner(null);
    setSaving(true);
    try {
      const res = await apiFetch('/api/branch', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          nif: form.nif,
          fiscalStart: form.fiscalStart,
          contact: form.contact,
          address: form.address,
          departments: form.departments,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'No se pudo guardar.');
      setData((prev) =>
        prev ? { ...prev, branch: json.branch, departmentsCount: json.departmentsCount } : prev
      );
      setForm(json.branch);
      setBanner({ type: 'success', text: 'Sucursal actualizada correctamente.' });
    } catch (err: any) {
      setBanner({ type: 'error', text: err?.message || 'No se pudo guardar.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !data) {
    return <div className={styles.loading}>Cargando sucursal…</div>;
  }

  const b = data.branch;

  return (
    <div className={styles.page}>
      {/* Breadcrumb */}
      <div className={styles.crumb}>
        <button type="button" onClick={() => router.back()} aria-label="Volver" className={styles.backBtn}>
          <ChevronLeft size={16} />
        </button>
        <span className={styles.crumbText}>ENTIDADES / SUCURSALES / {b.code}</span>
      </div>

      {/* Hero */}
      <div className={styles.hero}>
        <span className={styles.heroIcon}>
          <Building2 size={26} />
        </span>
        <div className={styles.heroInfo}>
          <span className={styles.heroCode}>SUCURSAL · {b.code}</span>
          <h1 className={styles.heroTitle}>{b.name}</h1>
          <div className={styles.chips}>
            <span className={styles.chip}>FISCAL YEAR {formatDateEs(b.fiscalStart)}</span>
            <span className={styles.chip}>ACTUALIZADO {formatDateEs(data.updatedAt)}</span>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className={styles.kpis}>
        <div className={styles.kpi}>
          <span className={styles.kpiLabel}><i className={styles.dotBlue} /> UBICACIONES</span>
          <span className={styles.kpiValue}>{data.locationsCount}</span>
          <span className={styles.kpiCaption}>Ubicaciones de inventario en esta sucursal</span>
        </div>
        <div className={styles.kpi}>
          <span className={styles.kpiLabel}><i className={styles.dotGreen} /> DEPARTAMENTOS</span>
          <span className={styles.kpiValue}>{data.departmentsCount}</span>
          <span className={styles.kpiCaption}>Equipos de esta sucursal</span>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs} role="tablist" aria-label="Secciones de sucursal">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'resumen'}
          onClick={() => setTab('resumen')}
          className={`${styles.tab} ${tab === 'resumen' ? styles.tabActive : ''}`}
        >
          Resumen
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'ubicaciones'}
          onClick={() => setTab('ubicaciones')}
          className={`${styles.tab} ${tab === 'ubicaciones' ? styles.tabActive : ''}`}
        >
          Ubicaciones {data.locationsCount}
        </button>
      </div>

      {banner && (
        <div role={banner.type === 'error' ? 'alert' : 'status'} className={`${styles.banner} ${banner.type === 'error' ? styles.bannerError : styles.bannerOk}`}>
          <span style={{ flex: 1 }}>{banner.text}</span>
          <button type="button" onClick={() => setBanner(null)} aria-label="Cerrar aviso" className={styles.bannerClose}>
            ×
          </button>
        </div>
      )}

      {tab === 'ubicaciones' ? (
        <div className={styles.card}>
          <div className={styles.cardTitle}>UBICACIONES DE ESTA SUCURSAL</div>
          {locations.length === 0 ? (
            <p className={styles.muted}>Sin ubicaciones registradas.</p>
          ) : (
            <ul className={styles.locList}>
              {locations.map((l) => (
                <li key={l.ref}>
                  <Link href="/inventory/locations" className={styles.locItem}>
                    <MapPin size={15} />
                    <span className={styles.locName}>{l.name}</span>
                    <span className={styles.locMeta}>{l.ref} · {l.branch || ''}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <form onSubmit={handleSave} className={styles.grid}>
          <div className={styles.col}>
            {/* Identidad */}
            <section className={styles.card}>
              <div className={styles.cardTitle}>IDENTIDAD</div>
              <label className={styles.field}>
                <span>Nombre de la sucursal *</span>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={120} placeholder="Nombre de la sucursal *" />
              </label>
              <label className={styles.field}>
                <span>Número de identificación fiscal (NIF)</span>
                <input value={form.nif} onChange={(e) => setForm({ ...form, nif: e.target.value })} maxLength={20} placeholder="Número de identificación fiscal (NIF)" />
              </label>
              <label className={styles.field}>
                <span>Inicio del año fiscal</span>
                <input type="date" value={form.fiscalStart} onChange={(e) => setForm({ ...form, fiscalStart: e.target.value })} />
              </label>
            </section>

            {/* Contacto */}
            <section className={styles.card}>
              <div className={styles.cardTitle}>CONTACTO</div>
              <label className={styles.field}>
                <span>Persona de contacto</span>
                <input value={form.contact.person} onChange={(e) => setField('contact', 'person', e.target.value)} maxLength={120} placeholder="Persona de contacto" />
              </label>
              <label className={styles.field}>
                <span>Teléfono</span>
                <input value={form.contact.phone} onChange={(e) => setField('contact', 'phone', e.target.value)} maxLength={40} placeholder="Teléfono" />
              </label>
              <label className={styles.field}>
                <span>Correo electrónico</span>
                <input type="email" value={form.contact.email} onChange={(e) => setField('contact', 'email', e.target.value)} maxLength={160} placeholder="Correo electrónico" />
              </label>
            </section>
          </div>

          <div className={styles.col}>
            {/* Dirección */}
            <section className={styles.card}>
              <div className={styles.cardTitle}>DIRECCIÓN</div>
              <label className={styles.field}>
                <span>Dirección</span>
                <input value={form.address.line1} onChange={(e) => setField('address', 'line1', e.target.value)} maxLength={160} placeholder="Dirección" />
              </label>
              <label className={styles.field}>
                <span>Dirección 2</span>
                <input value={form.address.line2} onChange={(e) => setField('address', 'line2', e.target.value)} maxLength={160} placeholder="Dirección 2" />
              </label>
              <div className={styles.row2}>
                <label className={styles.field}>
                  <span>Distrito</span>
                  <input value={form.address.district} onChange={(e) => setField('address', 'district', e.target.value)} maxLength={160} placeholder="Distrito" />
                </label>
                <label className={styles.field}>
                  <span>Ciudad</span>
                  <input value={form.address.city} onChange={(e) => setField('address', 'city', e.target.value)} maxLength={160} placeholder="Ciudad" />
                </label>
              </div>
              <div className={styles.row2}>
                <label className={styles.field}>
                  <span>Estado/Provincia</span>
                  <input value={form.address.state} onChange={(e) => setField('address', 'state', e.target.value)} maxLength={160} placeholder="Estado/Provincia" />
                </label>
                <label className={styles.field}>
                  <span>Código postal</span>
                  <input value={form.address.postal} onChange={(e) => setField('address', 'postal', e.target.value)} maxLength={160} placeholder="Código postal" />
                </label>
              </div>
              <label className={styles.field}>
                <span>País *</span>
                <select value={form.address.country} onChange={(e) => setField('address', 'country', e.target.value)} required>
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            </section>

            {/* Departamentos */}
            <section className={styles.card}>
              <div className={styles.cardTitleRow}>
                <span className={styles.cardTitle}>DEPARTAMENTOS</span>
                <span className={styles.count}>{form.departments.length}</span>
              </div>
              {form.departments.length === 0 ? (
                <p className={styles.muted}>Sin departamentos. Añade el primero abajo.</p>
              ) : (
                <ul className={styles.deptList}>
                  {form.departments.map((d) => (
                    <li key={d.id} className={styles.deptItem}>
                      <span>{d.name}</span>
                      <button type="button" onClick={() => removeDepartment(d.id)} aria-label={`Quitar ${d.name}`} className={styles.deptRemove}>
                        <X size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className={styles.deptAdd}>
                <input
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  placeholder="Nombre del departamento"
                  maxLength={80}
                  aria-label="Nombre del departamento"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addDepartment();
                    }
                  }}
                />
                <button type="button" onClick={addDepartment} className={styles.btnSecondary}>
                  <Plus size={14} /> Añadir departamento
                </button>
              </div>
            </section>
          </div>

          {/* Guardar */}
          <div className={styles.saveBar}>
            <button type="submit" disabled={saving} className={styles.btnPrimary}>
              {saving ? <Loader2 size={15} className={styles.spin} /> : <Save size={15} />}
              {saving ? 'Guardando…' : 'Guardar sucursal'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
