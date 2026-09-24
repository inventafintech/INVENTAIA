'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Search, SlidersHorizontal, Calendar, ChevronDown, ChevronRight } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';

type ActionFilter = 'all' | 'creado' | 'modificado' | 'eliminado';

interface ActivityEvent {
  id: string;
  ts: string;
  action: 'creado' | 'modificado' | 'eliminado' | 'fallido';
  entity: string;
  title: string;
  detail: string;
  actor: string;
}

const DAY_RANGES = [
  { value: '7', label: 'Últimos 7 días' },
  { value: '30', label: 'Últimos 30 días' },
  { value: '90', label: 'Últimos 90 días' },
  { value: '365', label: 'Último año' },
];

function relativeTimeEs(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'ahora mismo';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'hace 1 día';
  if (d < 30) return `hace ${d} días`;
  const m = Math.floor(d / 30);
  if (m === 1) return 'hace 1 mes';
  return `hace ${m} meses`;
}

function dayKey(ts: string): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dayLabel(ts: string): string {
  return new Intl.DateTimeFormat('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
    .format(new Date(ts))
    .toUpperCase();
}

function timeOfDay(ts: string): string {
  return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
}

const ACTION_STYLE: Record<string, { badge: React.CSSProperties; dot: string; label: string }> = {
  creado: {
    badge: { background: '#eff6ff', color: '#1d4ed8' },
    dot: '#2563eb',
    label: 'CREAR',
  },
  modificado: {
    badge: { background: '#fff7ed', color: '#c2410c' },
    dot: '#f97316',
    label: 'ACTUALIZAR',
  },
  eliminado: {
    badge: { background: '#fef2f2', color: '#b91c1c' },
    dot: '#ef4444',
    label: 'ELIMINAR',
  },
  fallido: {
    badge: { background: '#fef2f2', color: '#b91c1c' },
    dot: '#ef4444',
    label: 'FALLIDO',
  },
};

export default function ActividadPage() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [counts, setCounts] = useState({ total: 0, creado: 0, modificado: 0, eliminado: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ActionFilter>('all');
  const [query, setQuery] = useState('');
  const [days, setDays] = useState('30');
  const [expanded, setExpanded] = useState<string | null>(null);

  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams({ days, action: filter, q: debouncedQuery.trim() });
        const res = await fetch(`/api/actividad?${params.toString()}`, { cache: 'no-store' });
        if (res.ok && !cancelled) {
          const data = await res.json();
          setEvents(data.events || []);
          setCounts(data.counts || { total: 0, creado: 0, modificado: 0, eliminado: 0 });
        }
      } catch (err) {
        console.error('Error al cargar actividad:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [days, filter, debouncedQuery]);

  const groups = useMemo(() => {
    const map = new Map<string, ActivityEvent[]>();
    for (const e of events) {
      const k = dayKey(e.ts);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(e);
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [events]);

  const pct = (n: number) => (counts.total > 0 ? Math.round((n / counts.total) * 100) : 0);

  const kpis = [
    { key: 'total', label: 'ACTIVIDADES TOTALES', value: counts.total, share: 100, color: '#0f172a', caption: 'Todas las actividades rastreadas' },
    { key: 'creado', label: 'CREADO', value: counts.creado, share: pct(counts.creado), color: '#2563eb', caption: 'Nuevos registros añadidos' },
    { key: 'modificado', label: 'MODIFICADO', value: counts.modificado, share: pct(counts.modificado), color: '#f97316', caption: 'Registros actualizados' },
    { key: 'eliminado', label: 'ELIMINADO', value: counts.eliminado, share: 0, color: '#ef4444', caption: 'Registros eliminados' },
  ];

  const pills: Array<{ key: ActionFilter; label: string; count: number }> = [
    { key: 'all', label: 'TODOS', count: counts.total },
    { key: 'creado', label: 'CREADO', count: counts.creado },
    { key: 'modificado', label: 'MODIFICADO', count: counts.modificado },
    { key: 'eliminado', label: 'ELIMINADO', count: counts.eliminado },
  ];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
        {kpis.map((k, idx) => (
          <div
            key={k.key}
            style={{
              padding: '18px 20px',
              borderLeft: idx === 0 ? 'none' : '1px solid #e2e8f0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', color: '#475569' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: k.color }} />
              {k.label}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
              <span style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a' }}>{k.value}</span>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>{k.share}%</span>
            </div>
            <div style={{ height: '3px', background: '#f1f5f9', borderRadius: '999px', marginTop: '10px', overflow: 'hidden' }}>
              <div style={{ width: `${k.share}%`, height: '100%', background: k.color, borderRadius: '999px' }} />
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>{k.caption}</div>
          </div>
        ))}
      </div>

      {/* Listado */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
        {/* Toolbar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '14px 18px',
            borderBottom: '1px solid #e2e8f0',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', color: '#475569' }}>
            ACTIVIDADES RECIENTES
          </span>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              border: '1px solid #e2e8f0',
              borderRadius: '999px',
              padding: '4px',
              marginLeft: 'auto',
              flexWrap: 'wrap',
            }}
          >
            {pills.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setFilter(p.key)}
                style={{
                  border: 'none',
                  background: filter === p.key ? '#eff6ff' : 'transparent',
                  color: filter === p.key ? '#1d4ed8' : '#64748b',
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  padding: '6px 10px',
                  borderRadius: '999px',
                  cursor: 'pointer',
                }}
              >
                {p.label} <span style={{ fontWeight: 400 }}>{p.count}</span>
              </button>
            ))}
          </div>
          <div style={{ position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar actividades..."
              aria-label="Buscar actividades"
              style={{
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
                borderRadius: '8px',
                padding: '8px 10px 8px 32px',
                fontSize: '13px',
                outline: 'none',
                width: '200px',
              }}
            />
          </div>
          <button
            type="button"
            aria-label="Opciones de filtrado"
            style={{ border: '1px solid #e2e8f0', background: '#ffffff', borderRadius: '8px', padding: '8px', cursor: 'pointer', color: '#2563eb', display: 'flex' }}
          >
            <SlidersHorizontal size={15} />
          </button>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Calendar size={15} style={{ position: 'absolute', left: '10px', color: '#475569', pointerEvents: 'none' }} />
            <select
              value={days}
              onChange={(e) => setDays(e.target.value)}
              aria-label="Rango de fechas"
              style={{
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                borderRadius: '8px',
                padding: '8px 28px 8px 32px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#0f172a',
                outline: 'none',
                appearance: 'none',
                cursor: 'pointer',
              }}
            >
              {DAY_RANGES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <ChevronDown size={14} style={{ position: 'absolute', right: '10px', color: '#64748b', pointerEvents: 'none' }} />
          </div>
        </div>

        {/* Contenido */}
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
            Cargando auditoría…
          </div>
        ) : groups.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
            Sin actividad registrada para estos filtros.
          </div>
        ) : (
          groups.map(([key, dayEvents]) => (
            <div key={key}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 18px 4px 18px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.04em', color: '#64748b', whiteSpace: 'nowrap' }}>
                  {dayLabel(dayEvents[0].ts)}
                </span>
                <span style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
                <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.06em', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                  {dayEvents.length} EVENTO{dayEvents.length === 1 ? '' : 'S'}
                </span>
              </div>
              {dayEvents.map((e) => {
                const st = ACTION_STYLE[e.action] || ACTION_STYLE.modificado;
                const isOpen = expanded === e.id;
                return (
                  <div key={e.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '14px 18px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', minWidth: '86px' }}>
                        {timeOfDay(e.ts)}
                      </span>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: st.dot, flexShrink: 0 }} />
                      <span style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.04em', padding: '3px 8px', borderRadius: '5px', ...st.badge }}>
                        {st.label}
                      </span>
                      <div style={{ minWidth: '180px', flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{e.title}</div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                          {e.actor} · {e.entity}{e.detail ? ` · ${e.detail}` : ''}
                        </div>
                      </div>
                      <span style={{ fontSize: '12px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                        {relativeTimeEs(e.ts)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setExpanded(isOpen ? null : e.id)}
                        aria-label={isOpen ? 'Contraer detalle' : 'Expandir detalle'}
                        aria-expanded={isOpen}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b', display: 'flex' }}
                      >
                        {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>
                    </div>
                    {isOpen && e.detail && (
                      <div style={{ padding: '0 18px 14px 140px', fontSize: '12px', color: '#475569', lineHeight: 1.6 }}>
                        {e.detail}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))
        )}

        {/* Footer */}
        {!loading && groups.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px' }}>
            <span style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
            <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', color: '#94a3b8' }}>
              FIN DEL REGISTRO · {events.length} DE {events.length}
            </span>
            <span style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
          </div>
        )}
      </div>
    </div>
  );
}
