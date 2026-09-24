'use client';

import React, { useState, useEffect } from 'react';
import {
  BellPlus,
  BellRing,
  AlarmClock,
  Package,
  Loader2,
  Save,
} from 'lucide-react';

interface AlertItem {
  id: string;
  sku: string;
  name: string;
  stock: number;
  safety: number;
  rop: number;
  velocity: number;
  low: number;
  alerts: boolean;
  branch: string;
  locationRef: string;
}

export default function AlertsSettingsView() {
  const [items, setItems] = useState<AlertItem[]>([]);
  const [badges, setBadges] = useState({ products: 0, branches: 0, ai: 'Apagado' });
  const [globalLow, setGlobalLow] = useState(10);
  const [globalLowDraft, setGlobalLowDraft] = useState('10');
  const [reminders, setReminders] = useState(true);
  const [push, setPush] = useState(true);
  const [tab, setTab] = useState<'global' | 'ubicacion'>('global');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [edits, setEdits] = useState<Record<string, { low: string; safety: string; alerts: boolean }>>({});

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/inventory/alerts', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        setBadges(data.badges || { products: 0, branches: 0, ai: 'Apagado' });
        if (data.defaults) {
          setGlobalLow(data.defaults.globalLow ?? 10);
          setGlobalLowDraft(String(data.defaults.globalLow ?? 10));
          setReminders(data.defaults.reminders !== false);
          setPush(data.defaults.push !== false);
        }
        const next: Record<string, { low: string; safety: string; alerts: boolean }> = {};
        for (const it of data.items || []) {
          next[it.id] = { low: String(it.low), safety: String(it.safety), alerts: it.alerts };
        }
        setEdits(next);
      }
    } catch (err) {
      console.error('Error al cargar alertas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const flash = (type: 'success' | 'error', text: string) => {
    setBanner({ type, text });
    setTimeout(() => setBanner(null), 4000);
  };

  const savePrefs = async (payload: Record<string, unknown>, label: string) => {
    try {
      const res = await fetch('/api/inventory/alerts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'No se pudo guardar.');
      flash('success', `${label} guardado.`);
      load();
    } catch (err: any) {
      flash('error', err?.message || 'No se pudo guardar.');
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await load();
      flash('success', 'Configuración sincronizada con el inventario actual.');
    } finally {
      setSyncing(false);
    }
  };

  const saveRow = async (item: AlertItem) => {
    const draft = edits[item.id];
    if (!draft) return;
    const key = `row-${item.id}`;
    setSavingKey(key);
    try {
      const low = Math.floor(Number(draft.low));
      const safety = Math.floor(Number(draft.safety));
      if (!Number.isInteger(low) || low < 0) throw new Error('Umbral inválido (≥ 0).');
      if (!Number.isInteger(safety) || safety < 0) throw new Error('Safety inválido (≥ 0).');
      const res = await fetch('/api/inventory/alerts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: { [item.id]: { low, safety, alerts: draft.alerts } } }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'No se pudo guardar.');
      flash('success', `Umbrales de ${item.sku} guardados.`);
      load();
    } catch (err: any) {
      flash('error', err?.message || 'No se pudo guardar.');
    } finally {
      setSavingKey(null);
    }
  };

  const grouped = React.useMemo(() => {
    const map = new Map<string, AlertItem[]>();
    for (const it of items) {
      const k = it.locationRef || 'Sin ubicación';
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(it);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [items]);

  const visibleItems = items;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.04em', color: '#64748b' }}>
        CONFIGURACIÓN / AJUSTES DE ALERTA Y REORDEN
      </span>

      {/* Header */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px 22px', display: 'flex', alignItems: 'center', gap: '14px' }}>
        <span style={{ width: '52px', height: '52px', borderRadius: '12px', background: '#f1f5f9', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', flexShrink: 0 }}>
          <BellPlus size={24} />
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', color: '#94a3b8' }}>INVENTARIO</div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '2px 0 8px 0' }}>Configuración de alertas y reorden de stock</h1>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span style={badgeStyle}>PRODUCTOS {badges.products}</span>
            <span style={badgeStyle}>SUCURSALES {badges.branches}</span>
            <span style={badgeStyle}>IA {badges.ai}</span>
          </div>
        </div>
      </div>

      {/* Banner IA */}
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '220px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', color: '#475569' }}>
            RECOMENDACIONES DE UMBRAL CON IA
          </div>
          <div style={{ fontSize: '13px', color: '#0f172a', marginTop: '4px', lineHeight: 1.6 }}>
            Deja que la IA sugiera puntos de pedido óptimos, stock de seguridad y EOQ a partir de tu historial de
            ventas. Disponible en Essential y planes superiores.
          </div>
        </div>
        <button
          type="button"
          onClick={handleSync}
          disabled={syncing}
          style={{ background: syncing ? '#93c5fd' : '#2563eb', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '10px 20px', minHeight: '44px', fontSize: '13px', fontWeight: 700, cursor: syncing ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          {syncing && <Loader2 size={15} style={{ animation: 'inventa-spin 1s linear infinite' }} />}
          {syncing ? 'Sincronizando…' : 'Actualizar'}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '8px 12px' }} role="tablist" aria-label="Alcance de configuración">
        {(
          [
            ['global', 'Productos globalmente'],
            ['ubicacion', 'Productos por ubicación'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            style={{ border: 'none', background: 'transparent', color: tab === key ? '#2563eb' : '#64748b', fontSize: '14px', fontWeight: tab === key ? 700 : 500, padding: '10px 16px', minHeight: '44px', borderBottom: tab === key ? '2.5px solid #2563eb' : '2.5px solid transparent', cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            {label}
          </button>
        ))}
      </div>

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

      {/* Sección */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '240px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: 0 }}>Configuración Global de Productos</h2>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0', lineHeight: 1.6 }}>
            Establece umbrales de caducidad, alertas de stock bajo y puntos de reposición predeterminados aplicables
            a todos los productos en todas las sucursales y ubicaciones.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => savePrefs({ reminders: !reminders }, 'Recordatorios')}
            aria-pressed={reminders}
            title={reminders ? 'Desactivar recordatorios' : 'Activar recordatorios'}
            style={iconToggleStyle(reminders)}
          >
            <AlarmClock size={16} />
          </button>
          <button
            type="button"
            onClick={() => savePrefs({ push: !push }, 'Notificaciones push')}
            aria-pressed={push}
            title={push ? 'Desactivar notificaciones' : 'Activar notificaciones'}
            style={iconToggleStyle(push)}
          >
            <BellRing size={16} />
          </button>
        </div>
      </div>

      {/* Umbral global */}
      {!loading && visibleItems.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Umbral global de stock bajo</span>
          <input
            type="number"
            min={0}
            value={globalLowDraft}
            onChange={(e) => setGlobalLowDraft(e.target.value)}
            aria-label="Umbral global de stock bajo"
            style={{ width: '110px', padding: '8px 10px', minHeight: '44px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
          />
          <button
            type="button"
            onClick={async () => {
              const v = Math.floor(Number(globalLowDraft));
              if (!Number.isInteger(v) || v < 0) {
                flash('error', 'Umbral inválido (≥ 0).');
                return;
              }
              await savePrefs({ globalLow: v }, 'Umbral global');
              setGlobalLow(v);
            }}
            style={{ background: '#0f172a', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '8px 14px', minHeight: '44px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
          >
            Aplicar
          </button>
        </div>
      )}

      {/* Contenido */}
      {loading ? (
        <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
          Cargando configuración…
        </div>
      ) : visibleItems.length === 0 ? (
        <div style={{ border: '1.5px dashed #cbd5e1', borderRadius: '12px', background: '#ffffff', padding: '48px 24px', textAlign: 'center' }}>
          <Package size={36} color="#94a3b8" style={{ margin: '0 auto' }} />
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', marginTop: '12px' }}>Sin Productos Aún</div>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '8px auto 0 auto', maxWidth: '420px', lineHeight: 1.6 }}>
            La configuración de alertas de stock y reposición aparecerá aquí en cuanto agregues productos.
          </p>
        </div>
      ) : tab === 'ubicacion' ? (
        <LocationGroups
          items={visibleItems}
          edits={edits}
          setEdits={setEdits}
          savingKey={savingKey}
          onSave={saveRow}
        />
      ) : (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: '860px', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left', background: '#f8fafc' }}>
                  <th style={thStyle}>SKU / PRODUCTO</th>
                  <th style={thStyle}>STOCK / SAFETY</th>
                  <th style={thStyle}>ROP</th>
                  <th style={thStyle}>UMBRAL BAJO</th>
                  <th style={thStyle}>ALERTAS</th>
                  <th style={{ ...thStyle, textAlign: 'right', paddingRight: '18px' }}>ACCIÓN</th>
                </tr>
              </thead>
              <tbody>
                {visibleItems.map((item) => {
                  const draft = edits[item.id] || { low: String(item.low), safety: String(item.safety), alerts: item.alerts };
                  const below = item.stock <= Number(draft.low || 0);
                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 12px 12px 18px' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{item.name}</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>{item.sku}</div>
                      </td>
                      <td style={{ padding: '12px', fontVariantNumeric: 'tabular-nums', color: below ? '#b91c1c' : '#0f172a', fontWeight: below ? 700 : 400 }}>
                        {item.stock} u <span style={{ color: '#94a3b8', fontWeight: 400 }}>/ {item.safety}</span>
                      </td>
                      <td style={{ padding: '12px', color: '#475569', fontVariantNumeric: 'tabular-nums' }}>{item.rop} u</td>
                      <td style={{ padding: '12px' }}>
                        <input
                          type="number"
                          min={0}
                          value={draft.low}
                          onChange={(e) => setEdits((p) => ({ ...p, [item.id]: { ...draft, low: e.target.value } }))}
                          aria-label={`Umbral bajo para ${item.sku}`}
                          style={{ width: '90px', padding: '8px 10px', minHeight: '44px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                        />
                      </td>
                      <td style={{ padding: '12px' }}>
                        <input
                          type="number"
                          min={0}
                          value={draft.safety}
                          onChange={(e) => setEdits((p) => ({ ...p, [item.id]: { ...draft, safety: e.target.value } }))}
                          aria-label={`Safety stock para ${item.sku}`}
                          style={{ width: '90px', padding: '8px 10px', minHeight: '44px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                        />
                      </td>
                      <td style={{ padding: '12px' }}>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={draft.alerts}
                          aria-label={`Alertas para ${item.sku}`}
                          onClick={() => setEdits((p) => ({ ...p, [item.id]: { ...draft, alerts: !draft.alerts } }))}
                          style={{ width: '38px', height: '22px', borderRadius: '999px', border: 'none', background: draft.alerts ? '#2563eb' : '#cbd5e1', position: 'relative', cursor: 'pointer' }}
                        >
                          <span style={{ position: 'absolute', top: '2px', left: draft.alerts ? '20px' : '2px', width: '18px', height: '18px', borderRadius: '50%', background: '#ffffff', transition: 'left 0.15s ease' }} />
                        </button>
                      </td>
                      <td style={{ padding: '12px 18px 12px 12px', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => saveRow(item)}
                          disabled={savingKey === `row-${item.id}`}
                          style={{ background: '#0f172a', color: '#ffffff', border: 'none', borderRadius: '6px', padding: '8px 12px', minHeight: '44px', fontSize: '12px', fontWeight: 600, cursor: savingKey === `row-${item.id}` ? 'not-allowed' : 'pointer' }}
                        >
                          {savingKey === `row-${item.id}` ? '…' : 'Guardar'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <style>{`@keyframes inventa-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '12px',
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '0.05em',
  color: '#475569',
};

function LocationGroups({
  items,
  edits,
  setEdits,
  savingKey,
  onSave,
}: {
  items: Array<{ id: string; sku: string; name: string; stock: number; safety: number; rop: number; low: number; alerts: boolean; locationRef: string }>;
  edits: Record<string, { low: string; safety: string; alerts: boolean }>;
  setEdits: React.Dispatch<React.SetStateAction<Record<string, { low: string; safety: string; alerts: boolean }>>>;
  savingKey: string | null;
  onSave: (item: any) => void;
}) {
  const groups = React.useMemo(() => {
    const map = new Map<string, typeof items>();
    for (const it of items) {
      const k = it.locationRef || 'Sin ubicación';
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(it);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [items]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {groups.map(([loc, rows]) => (
        <div key={loc} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '12px 18px', borderBottom: '1px solid #e2e8f0', fontSize: '12px', fontWeight: 800, letterSpacing: '0.05em', color: '#0f172a', background: '#f8fafc' }}>
            {loc} · {rows.length} producto{rows.length === 1 ? '' : 's'}
          </div>
          {rows.map((item) => {
            const draft = edits[item.id] || { low: String(item.low), safety: String(item.safety), alerts: item.alerts };
            return (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 18px', borderBottom: '1px solid #f1f5f9', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '180px' }}>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '13px' }}>{item.name}</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                    {item.sku} · stock {item.stock} u · ROP {item.rop} u
                  </div>
                </div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  Umbral
                  <input
                    type="number"
                    min={0}
                    value={draft.low}
                    onChange={(e) => setEdits((p) => ({ ...p, [item.id]: { ...draft, low: e.target.value } }))}
                    aria-label={`Umbral bajo para ${item.sku}`}
                    style={{ width: '80px', padding: '8px 10px', minHeight: '44px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </label>
                <button
                  type="button"
                  role="switch"
                  aria-checked={draft.alerts}
                  aria-label={`Alertas para ${item.sku}`}
                  onClick={() => setEdits((p) => ({ ...p, [item.id]: { ...draft, alerts: !draft.alerts } }))}
                  style={{ width: '38px', height: '22px', borderRadius: '999px', border: 'none', background: draft.alerts ? '#2563eb' : '#cbd5e1', position: 'relative', cursor: 'pointer', flexShrink: 0 }}
                >
                  <span style={{ position: 'absolute', top: '2px', left: draft.alerts ? '20px' : '2px', width: '18px', height: '18px', borderRadius: '50%', background: '#ffffff', transition: 'left 0.15s ease' }} />
                </button>
                <button
                  type="button"
                  onClick={() => onSave(item)}
                  disabled={savingKey === `row-${item.id}`}
                  style={{ background: '#0f172a', color: '#ffffff', border: 'none', borderRadius: '6px', padding: '8px 12px', minHeight: '44px', fontSize: '12px', fontWeight: 600, cursor: savingKey === `row-${item.id}` ? 'not-allowed' : 'pointer' }}
                >
                  {savingKey === `row-${item.id}` ? '…' : 'Guardar'}
                </button>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

const badgeStyle: React.CSSProperties = {
  fontSize: '10px',
  fontWeight: 600,
  letterSpacing: '0.04em',
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  color: '#64748b',
  padding: '3px 9px',
  borderRadius: '6px',
  whiteSpace: 'nowrap',
};

const iconToggleStyle = (active: boolean): React.CSSProperties => ({
  border: active ? '1.5px solid #2563eb' : '1px solid #e2e8f0',
  background: active ? '#eff6ff' : '#f8fafc',
  color: active ? '#2563eb' : '#94a3b8',
  borderRadius: '8px',
  minWidth: '44px',
  minHeight: '44px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
});
