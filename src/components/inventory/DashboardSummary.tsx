'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import styles from './DashboardSummary.module.css';

/* ---------- Tipos reales del API (ver src/app/api/dashboard/inventario/route.ts) ---------- */

interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  categoryId: string;
  physicalStock: number;
  safetyStock: number;
  unitCost: number;
  unitPrice: number;
  totalValue: number;
  gmroi: string;
  gmroiValue: number;
  health: 'healthy' | 'low' | 'critical';
  healthLabel: 'Saludable' | 'Stock Bajo' | 'Quiebre Inminente';
}

interface InventoryMetrics {
  totalValue: number;
  totalUnits: number;
  monitoredSkus: number;
  avgGmroi: string;
}

interface ApiResponse {
  success: boolean;
  items?: InventoryItem[];
  metrics?: InventoryMetrics;
  error?: string;
}

/* ---------- Resumen consolidado (ver src/app/api/inventario/resumen/route.ts) ---------- */

interface AgingBucketApi {
  bucket: string;
  label: string;
  units: number;
  skuCount: number;
}

interface ResumenApi {
  success: boolean;
  kpis?: { turnover: number | null; turnoverLabel: string; daysAvailable: number | null };
  aging?: AgingBucketApi[];
  meta?: { isDaysAvailableEstimated: boolean };
}

interface CategorySlice {
  category: string;
  units: number;
}

interface AbcSegment {
  label: 'A' | 'B' | 'C';
  value: number;
  pct: number;
}

/* ---------- Helpers SVG (patrón artesanal del proyecto, sin libs) ---------- */

function buildLinePath(values: number[], w: number, h: number, pad: number): string {
  if (values.length === 0) return '';
  const max = Math.max(...values, 1);
  const stepX = values.length === 1 ? 0 : (w - pad * 2) / (values.length - 1);
  return values
    .map((v, i) => {
      const x = pad + i * stepX;
      const y = h - pad - (v / max) * (h - pad * 2);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className={styles.empty} role="status">
      <svg
        className={styles.emptyIcon}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M3 3v16a2 2 0 0 0 2 2h16" />
        <path d="M7 14l4-4 3 3 5-6" />
      </svg>
      <p className={styles.emptyText}>{text}</p>
    </div>
  );
}

const ACTIONS = [
  { href: '/inventario/recibos', title: 'Recibir stock', desc: 'Ingreso de mercadería al almacén' },
  { href: '/inventario/ajustes', title: 'Ajuste de stock', desc: 'Correcciones y regularizaciones' },
  { href: '/inventario/despachos', title: 'Despachar stock', desc: 'Salidas y entregas de stock' },
  { href: '/inventario/actual', title: 'Ver inventario', desc: 'Maestro de inventario valorizado' },
] as const;

export default function DashboardSummary() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [metrics, setMetrics] = useState<InventoryMetrics | null>(null);
  const [resumen, setResumen] = useState<ResumenApi | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/dashboard/inventario', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ApiResponse = await res.json();
      if (!data.success) throw new Error(data.error ?? 'Respuesta no exitosa del API');
      setItems(Array.isArray(data.items) ? data.items : []);
      setMetrics(data.metrics ?? null);
      // Consolidado (rotación/antigüedad/días): mejora progresiva, nunca bloquea
      try {
        const r2 = await fetch('/api/inventario/resumen', { cache: 'no-store' });
        if (r2.ok) {
          const s: ResumenApi = await r2.json();
          if (s.success) setResumen(s);
        }
      } catch {
        // Sin consolidado: el componente degrada a valores honestos (0 / '—' / empty)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido al cargar el resumen');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /* ---------- KPIs desde datos reales ---------- */

  const totalUnits = useMemo(
    () => metrics?.totalUnits ?? items.reduce((s, it) => s + (it.physicalStock || 0), 0),
    [metrics, items],
  );

  const totalValue = useMemo(
    () => metrics?.totalValue ?? items.reduce((s, it) => s + (it.totalValue || 0), 0),
    [metrics, items],
  );

  // Rotación = COGS / stock promedio. Sin movimientos → 0 honesto (ver resumen route).
  const rotation = resumen?.kpis?.turnover ?? 0;
  const rotationHint =
    resumen?.kpis?.turnoverLabel ?? 'COGS / stock promedio (0 sin movimientos)';

  // Días = stock / velocidad. Desconocido → '—' (indeterminado, no cero).
  const daysAvailable = resumen?.kpis?.daysAvailable ?? null;
  const daysEstimated = resumen?.meta?.isDaysAvailableEstimated ?? false;

  /* ---------- Tablas y alertas ---------- */

  const lowStockItems = useMemo(
    () => items.filter((it) => it.health === 'low' || it.health === 'critical'),
    [items],
  );
  const lowCount = useMemo(() => items.filter((it) => it.health === 'low').length, [items]);
  const outCount = useMemo(
    () => items.filter((it) => it.health === 'critical' || it.physicalStock <= 0).length,
    [items],
  );

  /* ---------- Charts ---------- */

  // Tendencia 30d: sin snapshots diarios reales → Empty State (no inventar curva).
  const trendValues: number[] = useMemo(() => [], []);
  const trendPath = useMemo(() => buildLinePath(trendValues, 1000, 300, 24), [trendValues]);
  // Path del área bajo la curva (concatenación simple, sin template anidado)
  const trendAreaPath = useMemo(
    () => (trendPath ? trendPath + ' L 976 300 L 24 300 Z' : ''),
    [trendPath],
  );

  // Stock por categoría: derivable de category + physicalStock reales.
  const stockByCategory = useMemo<CategorySlice[]>(() => {
    const map = new Map<string, number>();
    for (const it of items) {
      const key = it.category?.trim() || 'Sin categoría';
      map.set(key, (map.get(key) ?? 0) + (it.physicalStock || 0));
    }
    return [...map.entries()]
      .map(([category, units]) => ({ category, units }))
      .sort((a, b) => b.units - a.units)
      .slice(0, 8);
  }, [items]);
  const maxCategoryUnits = useMemo(
    () => Math.max(...stockByCategory.map((c) => c.units), 1),
    [stockByCategory],
  );

  // ABC por valorización (Pareto sobre totalValue real): A ≤80%, B ≤95%, C resto.
  const abc = useMemo<AbcSegment[]>(() => {
    if (items.length === 0) return [];
    const total = items.reduce((s, it) => s + (it.totalValue || 0), 0);
    if (total <= 0) return [];
    const sorted = [...items].sort((a, b) => (b.totalValue || 0) - (a.totalValue || 0));
    let acc = 0;
    let a = 0;
    let b = 0;
    for (const it of sorted) {
      acc += it.totalValue || 0;
      if (acc / total <= 0.8) a += it.totalValue || 0;
      else if (acc / total <= 0.95) b += it.totalValue || 0;
    }
    const c = Math.max(total - a - b, 0);
    return [
      { label: 'A', value: a, pct: (a / total) * 100 },
      { label: 'B', value: b, pct: (b / total) * 100 },
      { label: 'C', value: c, pct: (c / total) * 100 },
    ];
  }, [items]);

  // Segmentos del donut precalculados fuera del JSX (evita IIFE anidado)
  const donutSegments = useMemo(() => {
    const R = 70;
    const C = 2 * Math.PI * R;
    const colors: Record<'A' | 'B' | 'C', string> = { A: '#3b82f6', B: '#22c55e', C: '#f59e0b' };
    let acc = 0;
    return abc.map((s) => {
      const frac = s.pct / 100;
      const seg = {
        label: s.label,
        stroke: colors[s.label],
        dasharray: (frac * C).toFixed(1) + ' ' + C.toFixed(1),
        dashoffset: (-acc * C).toFixed(1),
      };
      acc += frac;
      return seg;
    });
  }, [abc]);

  // Antigüedad: del consolidado (created_at); sin fechas → Empty State.
  const agingBuckets: CategorySlice[] = useMemo(() => {
    if (!resumen?.aging || resumen.aging.length === 0) return [];
    const withUnits = resumen.aging.filter((b) => b.units > 0);
    if (withUnits.length === 0) return [];
    return withUnits.map((b) => ({ category: b.label, units: b.units }));
  }, [resumen]);
  const maxAgingUnits = useMemo(
    () => Math.max(...agingBuckets.map((b) => b.units), 1),
    [agingBuckets],
  );

  /* ---------- Estados ---------- */

  if (loading) {
    return (
      <div className={styles.container} role="status" aria-label="Cargando resumen de inventario">
        <div className={styles.stateBox}>
          <p className={styles.stateText}>Cargando resumen de inventario en tiempo real…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container} role="alert">
        <div className={styles.stateBox}>
          <p className={styles.stateTitle}>No se pudo cargar el resumen</p>
          <p className={styles.stateText}>{error}</p>
          <button type="button" className={styles.retryBtn} onClick={load}>
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Resumen</h1>
          <p className={styles.subtitle}>
            Inventario de un vistazo · KPIs, tendencias y alertas desde el maestro valorizado.
          </p>
        </div>
      </header>

      {items.length === 0 && (
        <div className={styles.stateBox} role="status">
          <p className={styles.stateTitle}>Sin stock registrado</p>
          <p className={styles.stateText}>
            Aún no hay artículos en el maestro. Registra un recibo para ver el resumen aquí.
          </p>
        </div>
      )}

      {/* ---------- 4 KPIs ---------- */}
      <section className={styles.kpiGrid} aria-label="Indicadores clave">
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Inventario total</span>
          <span className={styles.kpiValue}>{totalUnits.toLocaleString('es-PE')} u</span>
          <span className={styles.kpiHint}>
            {metrics?.monitoredSkus ?? items.length} SKUs · Artículos en stock
          </span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Valor total del stock</span>
          <span className={styles.kpiValue}>
            PEN {totalValue.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className={styles.kpiHint}>Valorizado a costo actual</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Rotación de inventario</span>
          <span className={styles.kpiValue}>{rotation.toFixed(1)}x</span>
          <span className={styles.kpiHint}>{rotationHint} · Veces por periodo</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Días disponibles</span>
          <span className={styles.kpiValue}>
            {daysAvailable === null ? '—' : daysAvailable.toFixed(0) + ' días'}
          </span>
          <span className={styles.kpiHint}>
            {daysAvailable === null ? 'Sin velocidad de venta' : daysEstimated ? 'Estimado · Días promedio' : 'Días promedio'}
          </span>
        </div>
      </section>

      {/* ---------- Charts SVG ---------- */}
      <section className={styles.chartsGrid} aria-label="Gráficos de inventario">
        <div className={styles.chartCard}>
          <h2 className={styles.chartTitle}>Valor del inventario</h2>
          <p className={styles.chartSub}>Últimos 30 días</p>
          {trendValues.length === 0 ? (
            <EmptyState text="La tendencia del valor de tu inventario aparecerá aquí cuando haya stock." />
          ) : (
            <svg className={styles.svgChart} viewBox="0 0 1000 300" preserveAspectRatio="none" role="img" aria-label="Tendencia de valor 30 días">
              <defs>
                <linearGradient id="resumenTrendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={trendAreaPath} fill="url(#resumenTrendGrad)" />
              <path d={trendPath} fill="none" stroke="#3b82f6" strokeWidth="4" strokeLinejoin="round" />
            </svg>
          )}
        </div>

        <div className={styles.chartCard}>
          <h2 className={styles.chartTitle}>Stock por categoría</h2>
          <p className={styles.chartSub}>Unidades disponibles, categorías principales</p>
          {stockByCategory.length === 0 ? (
            <EmptyState text="Ve cómo se distribuye tu stock entre las categorías cuando haya artículos." />
          ) : (
            <svg className={styles.svgChart} viewBox="0 0 600 280" role="img" aria-label="Stock por categoría">
              <title>Stock por categoría</title>
              {stockByCategory.map((c, i) => {
                const n = stockByCategory.length;
                const slot = 600 / n;
                const barW = Math.min(slot * 0.55, 72);
                const x = slot * i + (slot - barW) / 2;
                const h = Math.max((c.units / maxCategoryUnits) * 200, 4);
                const y = 230 - h;
                return (
                  <g key={c.category}>
                    <rect x={x} y={y} width={barW} height={h} rx="6" fill="#3b82f6" />
                    <text x={x + barW / 2} y={y - 8} textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--ink)">
                      {c.units.toLocaleString('es-PE')}
                    </text>
                    <text x={x + barW / 2} y={250} textAnchor="middle" fontSize="12" fill="var(--muted)">
                      {c.category.length > 12 ? c.category.slice(0, 11) + '…' : c.category}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}
        </div>

        <div className={styles.chartCard}>
          <h2 className={styles.chartTitle}>Concentración de valor (ABC)</h2>
          <p className={styles.chartSub}>Dónde se concentra el valor del stock</p>
          {abc.length === 0 ? (
            <EmptyState text="El análisis ABC clasifica tus productos por valor cuando haya stock." />
          ) : (
            <div className={styles.donutRow}>
              <svg className={styles.donut} viewBox="0 0 200 200" role="img" aria-label="Donut ABC por valorización">
                <title>Concentración ABC</title>
                {donutSegments.map((seg) => (
                  <circle
                    key={seg.label}
                    cx="100"
                    cy="100"
                    r="70"
                    fill="none"
                    stroke={seg.stroke}
                    strokeWidth="26"
                    strokeDasharray={seg.dasharray}
                    strokeDashoffset={seg.dashoffset}
                    transform="rotate(-90 100 100)"
                    strokeLinecap="butt"
                  />
                ))}
                <text x="100" y="96" textAnchor="middle" fontSize="22" fontWeight="800" fill="var(--ink)">
                  {abc[0] ? abc[0].pct.toFixed(0) + '%' : '—'}
                </text>
                <text x="100" y="116" textAnchor="middle" fontSize="12" fill="var(--muted)">
                  Clase A
                </text>
              </svg>
              <ul className={styles.legend}>
                {abc.map((s) => (
                  <li key={s.label}>
                    <span className={styles.legendDot} data-seg={s.label} aria-hidden="true" />
                    <strong>Clase {s.label}</strong>
                    <span>
                      {s.pct.toFixed(1)}% · PEN{' '}
                      {s.value.toLocaleString('es-PE', { maximumFractionDigits: 0 })}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className={styles.chartCard}>
          <h2 className={styles.chartTitle}>Antigüedad del stock</h2>
          <p className={styles.chartSub}>Días desde la última venta</p>
          {agingBuckets.length === 0 ? (
            <EmptyState text="La antigüedad del stock muestra cuánto tiempo llevan los artículos almacenados cuando haya stock." />
          ) : (
            <svg className={styles.svgChart} viewBox="0 0 600 280" role="img" aria-label="Antigüedad del stock">
              <title>Antigüedad del stock</title>
              {agingBuckets.map((b, i) => {
                const n = agingBuckets.length;
                const slot = 600 / n;
                const barW = Math.min(slot * 0.55, 72);
                const x = slot * i + (slot - barW) / 2;
                const h = Math.max((b.units / maxAgingUnits) * 200, 4);
                const y = 230 - h;
                return (
                  <g key={b.category}>
                    <rect x={x} y={y} width={barW} height={h} rx="6" fill="#8b5cf6" />
                    <text x={x + barW / 2} y={y - 8} textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--ink)">
                      {b.units.toLocaleString('es-PE')}
                    </text>
                    <text x={x + barW / 2} y={250} textAnchor="middle" fontSize="12" fill="var(--muted)">
                      {b.category}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}
        </div>
      </section>

      {/* ---------- Tablas ---------- */}
      <section className={styles.tablesGrid} aria-label="Alertas de stock">
        <div className={styles.tableCard}>
          <h2 className={styles.tableTitle}>Productos con pocas existencias</h2>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">SKU</th>
                  <th scope="col">Producto</th>
                  <th scope="col">Stock</th>
                  <th scope="col">Seguridad</th>
                  <th scope="col">Salud</th>
                </tr>
              </thead>
              <tbody>
                {lowStockItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className={styles.tableEmpty}>
                      No hay artículos con bajo stock
                    </td>
                  </tr>
                ) : (
                  lowStockItems.map((it) => (
                    <tr key={it.id}>
                      <td className={styles.skuCode}>{it.sku}</td>
                      <td>{it.name}</td>
                      <td>
                        <strong>{it.physicalStock.toLocaleString('es-PE')} u</strong>
                      </td>
                      <td>{it.safetyStock.toLocaleString('es-PE')} u</td>
                      <td>
                        {it.health === 'low' ? (
                          <span className={styles.badgeWarning}>Stock Bajo</span>
                        ) : (
                          <span className={styles.badgeDanger}>Quiebre Inminente</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className={styles.tableCard}>
          <div className={styles.tableHeadRow}>
            <h2 className={styles.tableTitle}>Resumen de alertas</h2>
            <Link href="/estrategia/riesgo-quiebre" className={styles.viewAll}>
              Ver todo →
            </Link>
          </div>
          <div className={styles.alertRow}>
            <span className={styles.alertDotLow} aria-hidden="true" />
            <div>
              <p className={styles.alertLabel}>Bajo stock</p>
              <p className={styles.alertHint}>Por debajo del stock de seguridad</p>
            </div>
            <strong className={styles.alertCount}>{lowCount}</strong>
          </div>
          <div className={styles.alertRow}>
            <span className={styles.alertDotOut} aria-hidden="true" />
            <div>
              <p className={styles.alertLabel}>Falta de stock</p>
              <p className={styles.alertHint}>Quiebre inminente o stock cero</p>
            </div>
            <strong className={styles.alertCount}>{outCount}</strong>
          </div>
        </div>
      </section>

      {/* ---------- Acciones rápidas ---------- */}
      <nav className={styles.actionsGrid} aria-label="Acciones rápidas">
        {ACTIONS.map((a) => (
          <Link key={a.href} href={a.href} className={styles.actionCard}>
            <span className={styles.actionTitle}>{a.title}</span>
            <span className={styles.actionDesc}>{a.desc}</span>
            <span className={styles.actionArrow} aria-hidden="true">
              →
            </span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
