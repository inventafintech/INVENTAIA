'use client';

import { useEffect, useMemo, useState } from 'react';

export interface LocationOption {
  ref: string;
  name: string;
  branch: string;
  status: string;
}

interface Props {
  value: string;
  onChange: (ref: string) => void;
  id?: string;
  label?: string;
  compact?: boolean;
}

/**
 * LocationSelector — selector global de Ubicación/Sucursal.
 * Consume GET /api/locations real (sin mocks): "Todas las ubicaciones"
 * + agrupadas por sucursal (optgroup). Al cambiar dispara el refetch del
 * padre con ?location_id= (re-evaluación dinámica SPA, sin recarga).
 * Responsive: width 100% con max-width, sin overflow a 320px.
 */
export default function LocationSelector({ value, onChange, id = 'location-selector', label = 'Ubicación', compact = false }: Props) {
  const [options, setOptions] = useState<LocationOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/locations?pageSize=100&order=asc', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setOptions((data.items || []).map((l: any) => ({ ref: l.ref, name: l.name, branch: l.branch, status: l.status })));
        }
      } catch {
        if (!cancelled) setOptions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, LocationOption[]>();
    for (const o of options) {
      const key = (o.branch || 'Sin sucursal').trim() || 'Sin sucursal';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(o);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [options]);

  return (
    <label
      htmlFor={id}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        minWidth: 0,
        maxWidth: '100%',
        fontSize: '12px',
        fontWeight: 600,
        color: 'var(--muted, #64748b)',
      }}
    >
      {!compact && (
        <span style={{ whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <span aria-hidden="true">📍</span> {label}:
        </span>
      )}
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        style={{
          minWidth: 0,
          maxWidth: '100%',
          width: compact ? undefined : 'min(240px, 100%)',
          background: 'var(--card, #fff)',
          border: value !== 'all' ? '1px solid #2563eb' : '1px solid var(--line, #e2e8f0)',
          boxShadow: value !== 'all' ? '0 0 0 3px rgba(37,99,235,0.12)' : 'none',
          borderRadius: '8px',
          padding: '8px 32px 8px 12px',
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--ink, #0f172a)',
          cursor: 'pointer',
          outline: 'none',
          minHeight: '38px',
          textOverflow: 'ellipsis',
        }}
      >
        <option value="all">Todas las ubicaciones</option>
        {loading ? (
          <option value="all" disabled>
            Cargando ubicaciones…
          </option>
        ) : grouped.length === 0 ? (
          <option value="all" disabled>
            Sin ubicaciones registradas
          </option>
        ) : grouped.length === 1 ? (
          grouped[0][1].map((o) => (
            <option key={o.ref} value={o.ref}>
              {o.name} · {o.ref}
            </option>
          ))
        ) : (
          grouped.map(([branch, locs]) => (
            <optgroup key={branch} label={branch}>
              {locs.map((o) => (
                <option key={o.ref} value={o.ref}>
                  {o.name} · {o.ref}
                </option>
              ))}
            </optgroup>
          ))
        )}
      </select>
    </label>
  );
}
