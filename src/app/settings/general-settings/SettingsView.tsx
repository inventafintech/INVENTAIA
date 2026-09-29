'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Settings as SettingsIcon,
  Sun,
  Moon,
  ZoomIn,
  Check,
  Loader2,
  Plus,
  Trash2,
  Stethoscope,
  Apple,
  Shirt,
  Cpu,
  Factory,
  Wrench,
  ExternalLink,
} from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import CompanySettingsForm from './CompanySettingsForm';
import {
  LANGUAGES,
  CURRENCIES,
  COUNTRIES,
  NUMBER_FORMATS,
  DATE_FORMATS,
  SECTORS,
  PRODUCT_FIELDS,
  SYSTEM_UNITS,
  PLAN_LIMITS,
  WorkspacePreferences,
  DEFAULT_PREFERENCES,
} from '@/lib/preferences';
import { PLANS, formatPlanPrice } from '@/lib/plans';

type TabKey = 'general' | 'sector' | 'facturacion' | 'plan' | 'empresa';

const SECTOR_ICONS: Record<string, React.ComponentType<{ size?: number | string }>> = {
  Stethoscope,
  Apple,
  Shirt,
  Cpu,
  Factory,
  Wrench,
};

const ZOOM_KEY = 'inventa_zoom';

function applyZoom(pct: number) {
  try {
    (document.documentElement.style as any).zoom = `${pct}%`;
  } catch {
    // navegadores sin soporte: se conserva la preferencia igualmente
  }
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      style={{
        width: '38px',
        height: '22px',
        borderRadius: '999px',
        border: 'none',
        background: checked ? 'var(--color-forest-ink)' : 'var(--color-pebble)',
        position: 'relative',
        cursor: 'pointer',
        flexShrink: 0,
        transition: 'background 0.15s ease',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: '2px',
          left: checked ? '20px' : '2px',
          width: '18px',
          height: '18px',
          borderRadius: '50%',
          background: '#ffffff',
          transition: 'left 0.15s ease',
          boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
        }}
      />
    </button>
  );
}

export default function SettingsView() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [tab, setTab] = useState<TabKey>('general');
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const [prefs, setPrefs] = useState<WorkspacePreferences>(DEFAULT_PREFERENCES);
  const [zoom, setZoom] = useState(100);
  const [newUnitName, setNewUnitName] = useState('');
  const [newUnitSymbol, setNewUnitSymbol] = useState('');

  const [sub, setSub] = useState<{ plan: string; status: string; trialDaysLeft: number; trialEndsAt: string | null; limits: any } | null>(null);
  const [cycle, setCycle] = useState<'mensual' | 'anual'>('anual');
  const [subLoading, setSubLoading] = useState(false);

  const flash = (type: 'success' | 'error', text: string) => {
    setBanner({ type, text });
    setTimeout(() => setBanner(null), 4000);
  };

  const load = async () => {
    setLoading(true);
    try {
      const [prefRes, subRes, billRes] = await Promise.all([
        fetch('/api/workspace/preferences', { cache: 'no-store' }),
        fetch('/api/billing/subscription', { cache: 'no-store' }),
        fetch('/api/billing/addons', { cache: 'no-store' }),
      ]);
      if (prefRes.ok) {
        const data = await prefRes.json();
        if (data?.preferences) setPrefs(data.preferences);
        if (data?.updatedAt) setUpdatedAt(data.updatedAt);
      }
      if (subRes.ok) {
        const data = await subRes.json();
        setSub(data);
      }
      if (billRes.ok) {
        const data = await billRes.json();
        if (data?.billing?.billingCycle) setCycle(data.billing.billingCycle);
      }
    } catch (err) {
      console.error('Error al cargar configuración:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    try {
      const saved = Number(window.localStorage.getItem(ZOOM_KEY));
      if (Number.isInteger(saved) && saved >= 75 && saved <= 125) {
        setZoom(saved);
        applyZoom(saved);
      }
    } catch {
      // sin zoom persistido
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const savePrefs = async (key: string, payload: Record<string, unknown>) => {
    setSavingKey(key);
    try {
      const res = await fetch('/api/workspace/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'No se pudo guardar.');
      if (data?.preferences) setPrefs(data.preferences);
      flash('success', 'Preferencia guardada.');
    } catch (err: any) {
      flash('error', err?.message || 'No se pudo guardar.');
    } finally {
      setSavingKey(null);
    }
  };

  const handleZoom = (pct: number) => {
    setZoom(pct);
    applyZoom(pct);
    try {
      window.localStorage.setItem(ZOOM_KEY, String(pct));
    } catch {
      // solo sesión
    }
  };

  const handleCycle = async (next: 'mensual' | 'anual') => {
    if (next === cycle) return;
    setCycle(next);
    try {
      await fetch('/api/billing/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cycle: next }),
      });
    } catch {
      // preferencia visual conservada
    }
  };

  const handleTrial = async () => {
    setSubLoading(true);
    try {
      const res = await fetch('/api/billing/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start-trial' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'No se pudo iniciar la prueba.');
      setSub((prev) => (prev ? { ...prev, plan: data.plan, status: data.status, trialDaysLeft: data.trialDaysLeft, trialEndsAt: data.trialEndsAt } : prev));
      flash('success', `Prueba Essential activa por ${data.trialDaysLeft} días. Sin cargo durante la prueba.`);
    } catch (err: any) {
      flash('error', err?.message || 'No se pudo iniciar la prueba.');
    } finally {
      setSubLoading(false);
    }
  };

  const handleCancelTrial = async () => {
    setSubLoading(true);
    try {
      const res = await fetch('/api/billing/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      });
      if (!res.ok) throw new Error('No se pudo cancelar.');
      const data = await res.json();
      setSub((prev) => (prev ? { ...prev, plan: data.plan, status: data.status, trialDaysLeft: 0 } : prev));
      flash('success', 'Suscripción cancelada. Volviste al plan Light.');
    } catch (err: any) {
      flash('error', err?.message || 'No se pudo cancelar.');
    } finally {
      setSubLoading(false);
    }
  };

  const handleAddUnit = () => {
    const name = newUnitName.trim();
    const symbol = newUnitSymbol.trim();
    if (!name || !symbol) {
      flash('error', 'Indica nombre y símbolo de la unidad.');
      return;
    }
    if (prefs.customUnits.some((u) => u.symbol.toLowerCase() === symbol.toLowerCase())) {
      flash('error', 'Ese símbolo ya existe.');
      return;
    }
    savePrefs('units', {
      customUnits: [...prefs.customUnits, { id: `cu-${Date.now().toString(36)}`, name, symbol }],
    }).then(() => {
      setNewUnitName('');
      setNewUnitSymbol('');
    });
  };

  const planLabel = (sub?.plan || 'light').toUpperCase();
  const currencyLabel = CURRENCIES.find((c) => c.value === prefs.locale.currency)?.value || prefs.locale.currency;
  const countryLabel = COUNTRIES.find((c) => c.value === prefs.locale.country)?.value || prefs.locale.country;
  const effectiveLimits = PLAN_LIMITS[(sub?.plan as keyof typeof PLAN_LIMITS) || 'light'] || PLAN_LIMITS.light;
  const fmtLimit = (v: number | null) => (v === null ? 'Ilimitado' : String(v));

  const essential = PLANS.find((p) => p.id === 'essential')!;
  const essentialPrice = cycle === 'anual' ? essential.annualMonthlyPrice! : essential.monthlyPrice!;
  const onTrial = sub?.status === 'trial' && sub.trialDaysLeft > 0;

  if (loading) {
    return <div style={{ padding: '48px', textAlign: 'center', color: 'var(--color-pebble)', fontSize: '13px' }}>Cargando configuración…</div>;
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.04em', color: 'var(--color-slate)' }}>
        CONFIGURACIÓN / CONFIGURACIÓN GENERAL
      </span>

      {/* Header */}
      <div style={{ background: '#ffffff', border: '1px solid var(--color-fog)', borderRadius: '10px', padding: '20px 22px', display: 'flex', alignItems: 'center', gap: '14px' }}>
        <span style={{ width: '52px', height: '52px', borderRadius: '10px', background: 'var(--color-fog)', border: '1px solid var(--color-fog)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-pebble)', flexShrink: 0 }}>
          <SettingsIcon size={24} />
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', color: 'var(--color-pebble)' }}>ESPACIO DE TRABAJO</div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-obsidian)', margin: '2px 0 8px 0' }}>Configuración y preferencias</h1>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              `PLAN ${planLabel}`,
              `DIVISA ${currencyLabel}`,
              `PAÍS ${countryLabel}`,
              `ACTUALIZADO ${updatedAt ? new Date(updatedAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}`,
            ].map((b) => (
              <span key={b} style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.04em', background: 'var(--color-paper)', border: '1px solid var(--color-fog)', color: 'var(--color-slate)', padding: '3px 9px', borderRadius: '6px', whiteSpace: 'nowrap' }}>
                {b}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', background: '#ffffff', border: '1px solid var(--color-fog)', borderRadius: '10px', padding: '8px 12px', overflowX: 'auto' }} role="tablist" aria-label="Secciones de configuración">
        {(
          [
            ['general', 'Configuración general'],
            ['sector', 'Sector y métricas'],
            ['facturacion', 'Facturación'],
            ['plan', 'Plan de suscripción'],
            ['empresa', 'Empresa'],
          ] as Array<[typeof tab, string]>
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            style={{ border: 'none', background: 'transparent', color: tab === key ? 'var(--color-forest-ink)' : 'var(--color-slate)', fontSize: '14px', fontWeight: tab === key ? 700 : 500, padding: '10px 16px', minHeight: '44px', borderBottom: tab === key ? '2.5px solid var(--color-forest-ink)' : '2.5px solid transparent', cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            {label}
          </button>
        ))}
      </div>

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

      {/* TAB 1: GENERAL */}
      {tab === 'general' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-obsidian)', margin: 0 }}>Región e idioma</h2>
            <p style={{ fontSize: '13px', color: 'var(--color-slate)', margin: '4px 0 0 0' }}>Cambiar idioma predeterminado y configuración regional</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '14px', alignItems: 'start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', minWidth: 0 }}>
              <section style={{ background: '#ffffff', border: '1px solid var(--color-fog)', borderRadius: '10px', overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--color-fog)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--color-charcoal)' }}>
                  APARIENCIA
                </div>
                <div style={{ padding: '16px 18px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setTheme('light')}
                    aria-pressed={theme === 'light'}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', border: theme === 'light' ? '1.5px solid var(--color-forest-ink)' : '1px solid var(--color-fog)', background: '#ffffff', color: theme === 'light' ? 'var(--color-forest-ink)' : 'var(--color-charcoal)', borderRadius: '9999px', padding: '10px 16px', minHeight: '44px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    <Sun size={15} /> Clásico<br />Claro
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme('dark')}
                    aria-pressed={theme === 'dark'}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', border: theme === 'dark' ? '1.5px solid var(--color-forest-ink)' : '1px solid var(--color-fog)', background: '#ffffff', color: theme === 'dark' ? 'var(--color-forest-ink)' : 'var(--color-charcoal)', borderRadius: '9999px', padding: '10px 16px', minHeight: '44px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    <Moon size={15} /> Clásico<br />Oscuro
                  </button>
                </div>
                <div style={{ margin: '0 18px 16px 18px', background: 'var(--color-paper)', border: '1px solid var(--color-fog)', borderRadius: '10px', padding: '10px 12px', fontSize: '12px', color: 'var(--color-charcoal)' }}>
                  Nota: las preferencias del tema se guardan en el almacenamiento local del navegador y persistirán entre sesiones.
                </div>
                <div style={{ padding: '0 18px 18px 18px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-obsidian)' }}>Zoom de la aplicación</div>
                  <div style={{ fontSize: '10px', color: 'var(--color-pebble)', letterSpacing: '0.03em', margin: '2px 0 8px 0' }}>
                    AJUSTA TODA LA APLICACIÓN PARA PANTALLAS PORTÁTILES MÁS PEQUEÑAS. LOS CAMBIOS SE APLICAN EN VIVO EN ESTA PESTAÑA.
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <ZoomIn size={16} color="var(--color-pebble)" />
                    <input
                      type="range"
                      min={75}
                      max={125}
                      step={5}
                      value={zoom}
                      onChange={(e) => handleZoom(Number(e.target.value))}
                      aria-label="Zoom de la aplicación"
                      style={{ flex: 1, accentColor: 'var(--color-forest-ink)' }}
                    />
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-obsidian)', minWidth: '40px', textAlign: 'right' }}>{zoom}%</span>
                  </div>
                </div>
              </section>

              <section style={{ background: '#ffffff', border: '1px solid var(--color-fog)', borderRadius: '10px', overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--color-fog)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--color-charcoal)' }}>
                  FORMATOS
                </div>
                <div style={{ padding: '6px 18px 16px 18px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '10px 0', borderBottom: '1px solid var(--color-fog)', fontSize: '13px', color: 'var(--color-charcoal)' }}>
                    Formato de Número
                    <select value={prefs.locale.numberFormat} onChange={(e) => savePrefs('numberFormat', { locale: { ...prefs.locale, numberFormat: e.target.value } })} style={{ minWidth: '200px', maxWidth: '60%', padding: '9px 12px', minHeight: '44px', borderRadius: '10px', border: '1px solid var(--color-pebble)', fontSize: '13px' }}>
                      {NUMBER_FORMATS.map((f) => (
                        <option key={f.value} value={f.value}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '10px 0', fontSize: '13px', color: 'var(--color-charcoal)' }}>
                    Formato de fecha
                    <select value={prefs.locale.dateFormat} onChange={(e) => savePrefs('dateFormat', { locale: { ...prefs.locale, dateFormat: e.target.value } })} style={{ minWidth: '200px', maxWidth: '60%', padding: '9px 12px', minHeight: '44px', borderRadius: '10px', border: '1px solid var(--color-pebble)', fontSize: '13px' }}>
                      {DATE_FORMATS.map((f) => (
                        <option key={f.value} value={f.value}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </section>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', minWidth: 0 }}>
              <section style={{ background: '#ffffff', border: '1px solid var(--color-fog)', borderRadius: '10px', overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--color-fog)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--color-charcoal)' }}>
                  REGIÓN
                </div>
                <div style={{ padding: '6px 18px 16px 18px' }}>
                  {(
                    [
                      ['Idioma por defecto', prefs.locale.language, LANGUAGES, (v: string) => ({ locale: { ...prefs.locale, language: v } })],
                      ['Moneda por defecto', prefs.locale.currency, CURRENCIES, (v: string) => ({ locale: { ...prefs.locale, currency: v } })],
                      ['País por defecto', prefs.locale.country, COUNTRIES, (v: string) => ({ locale: { ...prefs.locale, country: v } })],
                    ] as const
                  ).map(([label, value, options, build]) => (
                    <label key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '10px 0', borderBottom: '1px solid var(--color-fog)', fontSize: '13px', color: 'var(--color-charcoal)' }}>
                      {label}
                      <select
                        value={value}
                        disabled={savingKey !== null}
                        onChange={(e) => savePrefs(label, build(e.target.value))}
                        style={{ minWidth: '200px', maxWidth: '60%', padding: '9px 12px', minHeight: '44px', borderRadius: '10px', border: '1px solid var(--color-pebble)', fontSize: '13px', background: 'var(--color-paper)' }}
                      >
                        {options.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
              </section>

              <section style={{ background: '#ffffff', border: '1px solid var(--color-fog)', borderRadius: '10px', overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--color-fog)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--color-charcoal)' }}>
                  VALORES POR DEFECTO
                </div>
                <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-obsidian)' }}>Nivel global de stock bajo</div>
                    <div style={{ fontSize: '10px', color: 'var(--color-pebble)', letterSpacing: '0.03em', marginTop: '2px' }}>
                      ESTABLECER EL UMBRAL PREDETERMINADO DE BAJO STOCK PARA TODOS LOS PRODUCTOS
                    </div>
                  </div>
                  <input
                    type="number"
                    min={0}
                    max={1000000}
                    value={prefs.lowStockThreshold}
                    onChange={(e) => {
                      const v = Math.floor(Number(e.target.value));
                      if (Number.isInteger(v) && v >= 0) {
                        setPrefs((p) => ({ ...p, lowStockThreshold: v }));
                      }
                    }}
                    onBlur={(e) => {
                      const v = Math.floor(Number(e.target.value));
                      if (Number.isInteger(v) && v >= 0 && v !== prefs.lowStockThreshold) {
                        savePrefs('lowStock', { lowStockThreshold: v });
                      }
                    }}
                    aria-label="Nivel global de stock bajo"
                    style={{ width: '160px', padding: '9px 12px', minHeight: '44px', borderRadius: '10px', border: '1px solid var(--color-pebble)', background: 'var(--color-paper)', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SECTOR */}
      {tab === 'sector' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-obsidian)', margin: 0 }}>Sector y métricas</h2>
            <p style={{ fontSize: '13px', color: 'var(--color-slate)', margin: '4px 0 0 0' }}>
              Elige tu sector para adaptar automáticamente las métricas y configurar los campos relevantes. Luego puedes personalizar estos ajustes manualmente según sea necesario.
            </p>
          </div>

          <section style={{ background: '#ffffff', border: '1px solid var(--color-fog)', borderRadius: '10px', padding: '18px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--color-charcoal)', marginBottom: '4px' }}>SECTOR</div>
            <p style={{ fontSize: '12px', color: 'var(--color-slate)', margin: '0 0 12px 0' }}>
              Elija la opción más parecida. Son familias amplias, no oficios exactos, y todos los campos siguientes se pueden editar.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' }} role="radiogroup" aria-label="Sector">
              {SECTORS.map((s) => {
                const Icon = SECTOR_ICONS[s.icon] || Wrench;
                const active = prefs.sector === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => savePrefs('sector', { sector: s.id })}
                    style={{
                      border: active ? '1.5px solid var(--color-forest-ink)' : '1px solid var(--color-fog)',
                      background: active ? 'var(--color-linen-mist)' : '#ffffff',
                      color: active ? '#1d4ed8' : 'var(--color-charcoal)',
                      borderRadius: '10px',
                      padding: '14px 10px',
                      minHeight: '88px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      gap: '8px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 600,
                      textAlign: 'left',
                    }}
                  >
                    <Icon size={20} />
                    {s.label}
                  </button>
                );
              })}
            </div>
          </section>

          <section style={{ background: '#ffffff', border: '1px solid var(--color-fog)', borderRadius: '10px', padding: '18px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--color-charcoal)' }}>CAMPOS DE PRODUCTO</div>
            <p style={{ fontSize: '12px', color: 'var(--color-slate)', margin: '4px 0 8px 0' }}>
              Personaliza la configuración para controlar la visibilidad de varias secciones de tu aplicación. Selecciona qué secciones mostrar u ocultar según tus necesidades operativas.
            </p>
            {PRODUCT_FIELDS.map((f) => (
              <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid var(--color-fog)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-obsidian)' }}>{f.title}</div>
                  <div style={{ fontSize: '12px', color: 'var(--color-slate)' }}>{f.desc}</div>
                </div>
                <Toggle
                  checked={Boolean(prefs.productFields[f.id])}
                  label={f.title}
                  onChange={(v) => {
                    const next = { ...prefs.productFields, [f.id]: v };
                    setPrefs((p) => ({ ...p, productFields: next }));
                    savePrefs(`field-${f.id}`, { productFields: { [f.id]: v } });
                  }}
                />
              </div>
            ))}
          </section>

          <section style={{ background: '#ffffff', border: '1px solid var(--color-fog)', borderRadius: '10px', padding: '18px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--color-charcoal)' }}>SEGUIMIENTO</div>
            <p style={{ fontSize: '12px', color: 'var(--color-slate)', margin: '4px 0 8px 0' }}>
              Configure requisitos de seguimiento obligatorios para artículos de inventario. Estas configuraciones imponen el seguimiento del número de lote y la fecha de vencimiento en pedidos y envíos.
            </p>
            {(
              [
                ['lote', 'Seguimiento de número de lote', 'Requiere números de lote para el seguimiento del inventario en pedidos y envíos. Esencial para farmacéuticas e industrias reguladas.'],
                ['caducidad', 'Seguimiento de fecha de caducidad', 'Requiere fechas de caducidad para el seguimiento del inventario en pedidos y envíos. Importante para productos perecederos y sensibles al tiempo.'],
              ] as const
            ).map(([key, title, desc]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid var(--color-fog)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-obsidian)' }}>{title}</div>
                  <div style={{ fontSize: '12px', color: 'var(--color-slate)' }}>{desc}</div>
                </div>
                <Toggle
                  checked={prefs.tracking[key]}
                  label={title}
                  onChange={(v) => {
                    setPrefs((p) => ({ ...p, tracking: { ...p.tracking, [key]: v } }));
                    savePrefs(`tracking-${key}`, { tracking: { [key]: v } });
                  }}
                />
              </div>
            ))}
            <p style={{ fontSize: '12px', color: 'var(--color-pebble)', margin: '8px 0 0 0' }}>
              Cuando el seguimiento por número de lote y fecha de caducidad está deshabilitado, el inventario utiliza un seguimiento simplificado con datos agregados.
            </p>
          </section>

          <section style={{ background: '#ffffff', border: '1px solid var(--color-fog)', borderRadius: '10px', padding: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--color-charcoal)' }}>UNIDADES DE MEDIDA</div>
                <p style={{ fontSize: '12px', color: 'var(--color-slate)', margin: '4px 0 0 0' }}>
                  Unidades de medida del sistema y personalizadas disponibles para productos. Anule el modo y la precisión por unidad, o agregue unidades personalizadas.
                </p>
              </div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-charcoal)' }}>
                {SYSTEM_UNITS.length + prefs.customUnits.length} UNIDADES
              </span>
            </div>
            <div style={{ border: '1.5px dashed var(--color-pebble)', borderRadius: '10px', padding: '24px', textAlign: 'center', marginTop: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-obsidian)' }}>Unidades Personalizadas</div>
              {prefs.customUnits.length === 0 ? (
                <p style={{ fontSize: '12px', color: 'var(--color-slate)', margin: '6px 0 0 0' }}>
                  Sin unidades personalizadas definidas. Agregue una para crear una unidad específica para su negocio.
                </p>
              ) : (
                <ul style={{ listStyle: 'none', margin: '12px 0 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {prefs.customUnits.map((u) => (
                    <li key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--color-paper)', border: '1px solid var(--color-fog)', borderRadius: '10px', padding: '8px 8px 8px 12px', fontSize: '13px', fontWeight: 600, color: 'var(--color-obsidian)' }}>
                      <span style={{ flex: 1, textAlign: 'left' }}>
                        {u.name} <span style={{ color: 'var(--color-pebble)', fontWeight: 400 }}>({u.symbol})</span>
                      </span>
                      <button
                        type="button"
                        aria-label={`Quitar ${u.name}`}
                        onClick={() => savePrefs('units-del', { customUnits: prefs.customUnits.filter((x) => x.id !== u.id) })}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-pebble)', display: 'flex', minWidth: '44px', minHeight: '44px', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <input
                  value={newUnitName}
                  onChange={(e) => setNewUnitName(e.target.value)}
                  placeholder="Nombre (ej. Bidón)"
                  maxLength={60}
                  aria-label="Nombre de la unidad"
                  style={{ padding: '9px 12px', minHeight: '44px', borderRadius: '10px', border: '1px solid var(--color-pebble)', fontSize: '13px', minWidth: '160px' }}
                />
                <input
                  value={newUnitSymbol}
                  onChange={(e) => setNewUnitSymbol(e.target.value)}
                  placeholder="Símbolo (ej. bid)"
                  maxLength={12}
                  aria-label="Símbolo de la unidad"
                  style={{ padding: '9px 12px', minHeight: '44px', borderRadius: '10px', border: '1px solid var(--color-pebble)', fontSize: '13px', width: '130px' }}
                />
                <button
                  type="button"
                  onClick={handleAddUnit}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#ffffff', border: '1px solid var(--color-forest-ink)', color: 'var(--color-forest-ink)', borderRadius: '9999px', padding: '9px 14px', minHeight: '44px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                >
                  <Plus size={14} /> Agregar Unidad Personalizada
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* TAB 3: FACTURACIÓN */}
      {tab === 'facturacion' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-obsidian)', margin: 0 }}>Facturación y suscripción</h2>
            <p style={{ fontSize: '13px', color: 'var(--color-slate)', margin: '4px 0 0 0' }}>
              Gestiona tu suscripción, métodos de pago e historial de facturación.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '14px', alignItems: 'start' }}>
            <section style={{ background: '#ffffff', border: '1px solid var(--color-fog)', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--color-fog)' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--color-charcoal)' }}>PLAN ACTUAL</div>
                <div style={{ fontSize: '13px', color: 'var(--color-slate)', marginTop: '2px' }}>Inventario principal, ajustes de existencias y análisis básicos</div>
              </div>
              {(
                [
                  ['Plan', <strong key="p" style={{ color: 'var(--color-obsidian)' }}>{planLabel}</strong>],
                  ['Estado', <span key="e" style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '999px', background: '#f0fdf4', color: '#15803d' }}>ACTIVO</span>],
                  ['Límites del plan', <span key="l" style={{ fontSize: '12px', color: 'var(--color-obsidian)' }}>{`${fmtLimit(effectiveLimits.sucursales)} sucursal${effectiveLimits.sucursales === 1 ? '' : 'es'} • ${fmtLimit(effectiveLimits.usuarios)} usuarios • Hasta ${fmtLimit(effectiveLimits.productos)} productos`}</span>],
                ] as const
              ).map(([label, value]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '12px 18px', borderBottom: '1px solid var(--color-fog)', fontSize: '13px', color: 'var(--color-charcoal)' }}>
                  {label}
                  {value}
                </div>
              ))}
            </section>
            <section style={{ background: '#ffffff', border: '1px solid var(--color-fog)', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--color-fog)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--color-charcoal)' }}>
                GESTIONAR SUSCRIPCIÓN
              </div>
              <div style={{ padding: '14px 18px', fontSize: '13px', color: 'var(--color-charcoal)' }}>
                Estás en el plan gratuito Light. Actualiza a Essential para más funciones.
              </div>
              <div style={{ padding: '0 18px 18px 18px' }}>
                <button
                  type="button"
                  onClick={() => router.push('/plans')}
                  style={{ background: 'var(--color-lime-voltage)', color: 'var(--color-forest-ink)', border: 'none', borderRadius: '9999px', padding: '10px 18px', minHeight: '44px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Ver precios
                </button>
              </div>
            </section>
          </div>
          <section style={{ background: '#ffffff', border: '1px solid var(--color-fog)', borderRadius: '10px', overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--color-fog)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--color-charcoal)' }}>
              QUÉ INCLUYE TU PLAN
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '6px 20px', padding: '16px 18px' }}>
              {[
                'Catálogo de productos y seguimiento de stock',
                'Sucursales, ubicaciones, proveedores y clientes',
                'Ajustes manuales de stock',
                'Análisis básico e información de inventario',
                'Acceso basado en roles (roles básicos)',
                'Soporte por correo electrónico',
              ].map((f) => (
                <div key={f} style={{ display: 'flex', gap: '8px', fontSize: '13px', color: 'var(--color-charcoal)', lineHeight: 1.5 }}>
                  <Check size={14} color="#15803d" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* TAB 4: PLAN */}
      {tab === 'plan' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '220px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-obsidian)', margin: 0 }}>Planes de suscripción</h2>
              <p style={{ fontSize: '13px', color: 'var(--color-slate)', margin: '4px 0 0 0' }}>
                Elige el plan que se ajuste a tu negocio. Los inquilinos Light pueden cambiar de plan en autoservicio aquí, mientras que las suscripciones de pago existentes se gestionan en el portal de facturación.
              </p>
            </div>
            <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.04em', color: 'var(--color-charcoal)' }}>
              TU PLAN ACTUAL: {planLabel}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid var(--color-fog)', borderRadius: '10px', padding: '4px', background: '#ffffff' }} role="group" aria-label="Ciclo de facturación">
              {(['mensual', 'anual'] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => handleCycle(c)}
                  aria-pressed={cycle === c}
                  style={{ border: 'none', background: cycle === c ? 'var(--color-forest-ink)' : 'transparent', color: cycle === c ? '#ffffff' : 'var(--color-slate)', borderRadius: '7px', padding: '8px 14px', minHeight: '44px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', textTransform: 'capitalize' }}
                >
                  {c}
                  {c === 'anual' && <span style={{ fontWeight: 400, opacity: 0.85 }}> Ahorre 20%</span>}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px', alignItems: 'stretch' }}>
            {/* Light */}
            <div style={{ background: '#ffffff', border: sub?.plan === 'light' ? '1.5px solid var(--color-forest-ink)' : '1px solid var(--color-fog)', borderRadius: '10px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--color-charcoal)' }}>LIGHT</div>
              <p style={{ fontSize: '12px', color: 'var(--color-slate)', margin: 0 }}>Para equipos pequeños que necesitan inventario central, ajustes de existencias y análisis básicos</p>
              <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--color-obsidian)' }}>Gratis</div>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: '12px', color: 'var(--color-charcoal)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <li>1 sucursal • 2 usuarios • Hasta 500 productos</li>
                <li>✓ Catálogo de productos y seguimiento de inventario.</li>
                <li>✓ Ajustes de stock</li>
                <li>✓ Sucursales, ubicaciones, proveedores y clientes</li>
                <li>✓ Análisis básico</li>
                <li>✓ Roles básicos</li>
                <li>✓ Soporte por correo electrónico</li>
              </ul>
              <button type="button" disabled style={{ marginTop: 'auto', background: 'var(--color-fog)', color: 'var(--color-pebble)', border: '1px solid var(--color-fog)', borderRadius: '9999px', padding: '10px', minHeight: '44px', fontSize: '13px', fontWeight: 700, cursor: 'not-allowed' }}>
                {sub?.plan === 'light' ? 'Plan actual' : 'Plan actual'}
              </button>
            </div>

            {/* Essential */}
            <div style={{ background: '#ffffff', border: '1px solid var(--color-fog)', borderRadius: '10px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--color-charcoal)' }}>ESSENTIAL</div>
              <p style={{ fontSize: '12px', color: 'var(--color-slate)', margin: 0 }}>Para empresas en crecimiento que necesitan inventario en múltiples ubicaciones y flujos de trabajo de pedidos</p>
              <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--color-obsidian)' }}>
                ${cycle === 'anual' ? '79' : '98.75'}
                <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--color-pebble)' }}> /MES, FACTURADO {cycle === 'anual' ? 'ANUALMENTE' : 'MENSUALMENTE'}</span>
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: '12px', color: 'var(--color-charcoal)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <li>Hasta 5 sucursales • Hasta 20 usuarios • Hasta 5000 productos</li>
                <li>7 días gratis, después $850/año. Cancele antes de que termine la prueba y no pague nada. La facturación anual ahorra $228.</li>
                <li>✓ Todo en Light, más:</li>
                <li>✓ Inventario en múltiples ubicaciones y reubicación de existencias</li>
                <li>✓ Flujos de compra, ventas y reubicación</li>
                <li>✓ Devoluciones, envíos y facturas</li>
                <li>✓ Precios básicos y gestión de usuarios.</li>
                <li>✓ Centro de informes</li>
              </ul>
              {onTrial ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#15803d' }}>
                    Prueba activa: quedan {sub.trialDaysLeft} día{sub.trialDaysLeft === 1 ? '' : 's'} (hasta {sub.trialEndsAt ? new Date(sub.trialEndsAt).toLocaleDateString('es-PE') : ''})
                  </span>
                  <button type="button" onClick={handleCancelTrial} disabled={subLoading} style={{ background: '#ffffff', color: 'var(--color-alarm-red)', border: '1px solid var(--color-alarm-red)', borderRadius: '9999px', padding: '10px', minHeight: '44px', fontSize: '13px', fontWeight: 700, cursor: subLoading ? 'not-allowed' : 'pointer' }}>
                    Cancelar prueba
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleTrial}
                  disabled={subLoading}
                  style={{ marginTop: 'auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: subLoading ? 'var(--color-fog)' : 'var(--color-lime-voltage)', color: 'var(--color-forest-ink)', border: 'none', borderRadius: '9999px', padding: '10px', minHeight: '44px', fontSize: '13px', fontWeight: 700, cursor: subLoading ? 'not-allowed' : 'pointer' }}
                >
                  {subLoading && <Loader2 size={15} style={{ animation: 'inventa-spin 1s linear infinite' }} />}
                  Iniciar prueba gratuita de 7 días
                </button>
              )}
            </div>

            {/* Pro */}
            <div style={{ background: '#ffffff', border: '1px solid var(--color-fog)', borderRadius: '10px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--color-charcoal)' }}>PRO</div>
              <p style={{ fontSize: '12px', color: 'var(--color-slate)', margin: 0 }}>Para equipos que necesitan flujos de trabajo avanzados, POS, consignación, análisis y acceso a API.</p>
              <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--color-obsidian)' }}>
                Personalizado <span style={{ fontSize: '10px', fontWeight: 400, color: 'var(--color-pebble)' }}>CONTACTAR VENTAS</span>
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: '12px', color: 'var(--color-charcoal)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <li>Hasta 10 sucursales • Hasta 50 usuarios • Hasta 50000 productos</li>
                <li>✓ Todo en Essential, más:</li>
                <li>✓ Flujos de trabajo avanzados de inventario y pedidos</li>
                <li>✓ Solicitudes de pedido, RFQ y cotizaciones</li>
                <li>✓ Flujos de trabajo de aprobación y pick & pack</li>
                <li>✓ Devoluciones, envíos y precios avanzados</li>
                <li>✓ Multidivisa, análisis avanzado y previsión</li>
                <li>✓ TPV y consignación incluidos</li>
                <li>✓ Acceso API e integraciones principales</li>
              </ul>
              <button
                type="button"
                onClick={() => router.push('/addons')}
                style={{ marginTop: 'auto', background: '#ffffff', color: 'var(--color-forest-ink)', border: '1px solid var(--color-forest-ink)', borderRadius: '9999px', padding: '10px', minHeight: '44px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
              >
                Contactar ventas
              </button>
            </div>
          </div>

          {/* Enterprise */}
          <div style={{ background: '#ffffff', border: '1px solid var(--color-fog)', borderRadius: '10px', padding: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--color-charcoal)' }}>ENTERPRISE</div>
            <p style={{ fontSize: '12px', color: 'var(--color-slate)', margin: '4px 0 12px 0' }}>
              Para empresas que necesitan un portal de clientes, inteligencia artificial, integraciones avanzadas y controles empresariales.
            </p>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-obsidian)' }}>
              Personalizado <span style={{ fontSize: '10px', fontWeight: 400, color: 'var(--color-pebble)' }}>CONTACTAR VENTAS</span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-charcoal)', margin: '8px 0' }}>Sucursales ilimitadas • Usuarios ilimitados • Productos ilimitados</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '4px 20px', fontSize: '12px', color: 'var(--color-charcoal)' }}>
              {[
                'Todo en Pro, más:',
                'SSO, registros de auditoría y flujos de trabajo de automatización',
                'Factura electrónica para Italia',
                'Implementación personalizada del portal definida con nuestro equipo',
                'Marca blanca',
                'Agente de IA',
                'Integraciones avanzadas',
              ].map((f) => (
                <div key={f} style={{ display: 'flex', gap: '8px', lineHeight: 1.6 }}>
                  <Check size={13} color="#15803d" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>{f}</span>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => router.push('/addons')}
              style={{ marginTop: '12px', width: '100%', background: '#ffffff', color: 'var(--color-forest-ink)', border: '1px solid var(--color-forest-ink)', borderRadius: '9999px', padding: '10px', minHeight: '44px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
            >
              Contactar ventas
            </button>
          </div>

          <div style={{ borderLeft: '3px solid var(--color-forest-ink)', background: 'var(--color-paper)', borderRadius: '0 8px 8px 0', padding: '12px 14px', fontSize: '12px', color: 'var(--color-charcoal)', lineHeight: 1.6 }}>
            Los nuevos inquilinos Light pueden iniciar aquí una prueba de Essential: se requiere tarjeta, no hay cargo durante 7 días, y si cancela antes de que termine la prueba, no paga nada. Las suscripciones de pago existentes, incluidas la cancelación y los cambios de plan, se gestionan desde el portal de facturación. La facturación anual está disponible con un 20% de descuento. Contacte con ventas para soluciones empresariales a medida.
          </div>
        </div>
      )}
      {/* TAB 5: EMPRESA (parámetros corporativos y ROP existentes) */}
      {tab === 'empresa' && (
        <div>
          <h2 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-obsidian)', margin: '0 0 4px 0' }}>Empresa y algoritmo</h2>
          <p style={{ fontSize: '13px', color: 'var(--color-slate)', margin: '0 0 14px 0' }}>
            Administra los parámetros corporativos, reglas del algoritmo de reabastecimiento y canales de notificación.
          </p>
          <CompanySettingsForm />
        </div>
      )}

      <style>{`@keyframes inventa-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
