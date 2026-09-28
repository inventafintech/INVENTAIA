'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import LocationSelector from '@/components/inventory/LocationSelector';
import { triggerNotificationRefresh } from '@/context/NotificationContext';

interface OverviewPayload {
  success: boolean;
  kpis: {
    inventoryValue: number;
    breakRiskCount: number;
    breakRiskAmount: number;
    deadStockAmount: number;
    requiredCapital: number;
  };
  forecast: {
    points: Array<{ day: number; projectedDemand: number; stockLeft: number }>;
    breakDay: number | null;
    dailyDemand: number;
    totalStock: number;
  };
  health: { critical: number; low: number; healthy: number; total: number };
  topActions: Array<{
    id: string;
    sku: string;
    productName: string;
    provider: string;
    coverageDays: number;
    suggestedQty: number;
    investment: number;
    status: 'critical' | 'warning' | 'optimal';
  }>;
  durationMs?: number;
  error?: string;
}

function fmtPEN(n: number): string {
  return `S/ ${Number(n || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * DashboardOverview — centro de control ejecutivo (estándar Stripe/Ramp).
 * Tres niveles verticales y nada más: ① 4 KPIs → ② forecast 90d + salud →
 * ③ top 5 acciones. Sin gráficos decorativos, sin mocks: todo viene de
 * GET /api/dashboard/overview y se recalcula con ?location_id= sin recargar.
 */
export default function DashboardOverview() {
  const [data, setData] = useState<OverviewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState('all');
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const load = useCallback(async (loc: string) => {
    try {
      setLoading(true);
      setError(null);
      const q = loc !== 'all' ? `?location_id=${encodeURIComponent(loc)}` : '';
      const res = await fetch(`/api/dashboard/overview${q}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || `HTTP ${res.status}`);
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar el panel');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(location);
  }, [load, location]);

  const locSuffix = location !== 'all' ? `?location_id=${encodeURIComponent(location)}` : '';

  const healthPct = useMemo(() => {
    const t = data?.health.total || 0;
    if (t === 0) return { critical: 0, low: 0, healthy: 0 };
    return {
      critical: ((data?.health.critical || 0) / t) * 100,
      low: ((data?.health.low || 0) / t) * 100,
      healthy: ((data?.health.healthy || 0) / t) * 100,
    };
  }, [data]);

  const forecastPaths = useMemo(() => {
    const pts = data?.forecast.points || [];
    if (pts.length === 0) return null;
    const W = 900;
    const H = 260;
    const PAD = 28;
    const maxY = Math.max(data?.forecast.totalStock || 0, pts[pts.length - 1].projectedDemand, 1);
    const x = (day: number) => PAD + (day / 90) * (W - PAD * 2);
    const y = (v: number) => H - PAD - (v / maxY) * (H - PAD * 2);
    const demand = pts.map((p) => `${p.day === 1 ? 'M' : 'L'} ${x(p.day).toFixed(1)} ${y(p.projectedDemand).toFixed(1)}`).join(' ');
    const stock = pts.map((p) => `${p.day === 1 ? 'M' : 'L'} ${x(p.day).toFixed(1)} ${y(p.stockLeft).toFixed(1)}`).join(' ');
    const breakX = data?.forecast.breakDay ? x(data.forecast.breakDay) : null;
    return { demand, stock, breakX, W, H, maxY };
  }, [data]);

  const handleGenerateOC = async (itemId: string, sku: string) => {
    try {
      setGeneratingId(itemId);
      setFeedback(null);
      const res = await fetch('/api/dashboard/reabastecimiento/oc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setFeedback({ type: 'ok', text: `Orden generada para ${sku}: ${json.summary || 'OC creada.'}` });
        triggerNotificationRefresh();
        await load(location);
      } else {
        setFeedback({ type: 'err', text: json.error || `No se pudo generar la orden de ${sku}.` });
      }
    } catch (err: any) {
      setFeedback({ type: 'err', text: `Error de red: ${err.message}` });
    } finally {
      setGeneratingId(null);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-7xl flex flex-col gap-4" role="status" aria-label="Cargando panel ejecutivo">
        <div className="h-9 w-2/3 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" />
        <div className="h-48 animate-pulse rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto w-full max-w-7xl" role="alert">
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 dark:border-red-900 dark:bg-red-950">
          <p className="font-bold text-red-800 dark:text-red-200">No se pudo cargar el panel</p>
          <p className="mt-1 text-sm text-red-600 dark:text-red-300">{error || 'Respuesta inválida del servidor'}</p>
          <button
            type="button"
            onClick={() => load(location)}
            className="mt-4 min-h-[44px] rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const kpis = [
    {
      label: 'Valor total del inventario',
      value: fmtPEN(data.kpis.inventoryValue),
      hint: 'Stock físico valorizado a costo',
      href: `/dashboard/inventario${locSuffix}`,
      accent: 'bg-slate-900 dark:bg-slate-100',
    },
    {
      label: 'Riesgo de quiebre (< 3 días)',
      value: `${data.kpis.breakRiskCount} SKUs`,
      hint: `${fmtPEN(data.kpis.breakRiskAmount)} en ventas bajo riesgo`,
      href: '/dashboard/reabastecimiento',
      accent: 'bg-red-600',
    },
    {
      label: 'Capital inmovilizado',
      value: fmtPEN(data.kpis.deadStockAmount),
      hint: 'Stock sin señal de rotación',
      href: `/dashboard/inventario${locSuffix}`,
      accent: 'bg-amber-500',
    },
    {
      label: 'Capital requerido',
      value: fmtPEN(data.kpis.requiredCapital),
      hint: 'Compras sugeridas próximo ciclo',
      href: '/dashboard/ordenes',
      accent: 'bg-emerald-600',
    },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl flex min-w-0 flex-col gap-4">
      {/* Botonera ejecutiva superior */}
      <header className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 basis-56">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Panel · Centro de control</p>
          <h1 className="truncate text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            ¿Qué pasa, qué viene, qué hago?
          </h1>
          {location !== 'all' && (
            <span className="mt-2 inline-flex max-w-full items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-bold text-blue-700">
              <span className="truncate">📍 {location}</span>
              <button type="button" onClick={() => setLocation('all')} aria-label="Quitar filtro de ubicación" className="font-extrabold">
                ✕
              </button>
            </span>
          )}
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <LocationSelector value={location} onChange={setLocation} />
          <Link
            href="/dashboard/ordenes"
            className="inline-flex min-h-[38px] items-center whitespace-nowrap rounded-lg bg-slate-900 px-4 py-2 text-[13px] font-semibold text-white hover:bg-slate-700 dark:bg-white dark:text-slate-900"
          >
            + Nueva orden de compra
          </Link>
          <Link
            href="/inventory/stock-adjustments"
            className="inline-flex min-h-[38px] items-center whitespace-nowrap rounded-lg border border-slate-200 bg-white px-4 py-2 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            Ajuste rápido
          </Link>
        </div>
      </header>

      {feedback && (
        <div
          role={feedback.type === 'err' ? 'alert' : 'status'}
          className={
            feedback.type === 'ok'
              ? 'rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] font-semibold text-emerald-800'
              : 'rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-semibold text-red-800'
          }
        >
          <span className="flex items-center gap-2">
            <span className="flex-1">{feedback.text}</span>
            <button type="button" onClick={() => setFeedback(null)} aria-label="Cerrar aviso" className="font-bold">
              ×
            </button>
          </span>
        </div>
      )}

      {/* Nivel 1: 4 KPIs — cada tarjeta navega a su módulo */}
      <section aria-label="Indicadores ejecutivos" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <Link
            key={k.label}
            href={k.href}
            className="group flex min-w-0 flex-col gap-1 rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-600"
          >
            <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
              <span className={`h-2 w-2 shrink-0 rounded-full ${k.accent}`} aria-hidden="true" />
              <span className="truncate">{k.label}</span>
            </span>
            <span className="truncate text-2xl font-extrabold tabular-nums tracking-tight text-slate-900 dark:text-white">
              {k.value}
            </span>
            <span className="truncate text-xs text-slate-500">
              {k.hint} <span aria-hidden="true" className="font-bold text-slate-400 group-hover:text-slate-700">→</span>
            </span>
          </Link>
        ))}
      </section>

      {/* Nivel 2: forecast 90d + salud del inventario */}
      <section aria-label="Proyección de demanda" className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:p-5">
        <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Forecast 90 días vs. stock actual</h2>
            <p className="truncate text-xs text-slate-500">
              Demanda proyectada (Σ velocidad real) contra agotamiento del stock
              {data.forecast.breakDay ? ` · quiebre estimado día ${data.forecast.breakDay}` : ' · sin quiebre en el horizonte'}
            </p>
          </div>
          <span className="whitespace-nowrap text-xs font-semibold tabular-nums text-slate-500">
            {data.forecast.totalStock.toLocaleString('es-PE')} u hoy · {data.forecast.dailyDemand.toLocaleString('es-PE')} u/día
          </span>
        </div>
        {forecastPaths ? (
          <div className="mt-3 min-w-0">
            <svg viewBox={`0 0 ${forecastPaths.W} ${forecastPaths.H}`} className="h-56 w-full sm:h-64" role="img" aria-label="Curva de demanda proyectada y línea de stock">
              {[0.25, 0.5, 0.75, 1].map((f) => (
                <line
                  key={f}
                  x1="28"
                  x2="872"
                  y1={260 - 28 - f * (260 - 56)}
                  y2={260 - 28 - f * (260 - 56)}
                  stroke="#e2e8f0"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
              ))}
              <path d={forecastPaths.demand} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinejoin="round" />
              <path d={forecastPaths.stock} fill="none" stroke="#dc2626" strokeWidth="3" strokeLinejoin="round" />
              {forecastPaths.breakX !== null && (
                <g>
                  <line x1={forecastPaths.breakX} x2={forecastPaths.breakX} y1="16" y2="244" stroke="#dc2626" strokeWidth="1.5" strokeDasharray="5 4" />
                  <circle cx={forecastPaths.breakX} cy={260 - 28} r="5" fill="#dc2626" />
                </g>
              )}
            </svg>
            <div className="mt-2 flex flex-wrap gap-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-5 bg-blue-600" /> Demanda acumulada</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-5 bg-red-600" /> Stock restante</span>
              {data.forecast.breakDay && <span className="text-red-600">● Punto de quiebre: día {data.forecast.breakDay}</span>}
            </div>
          </div>
        ) : (
          <p role="status" className="mt-3 rounded-lg bg-slate-50 px-4 py-6 text-center text-[13px] text-slate-500 dark:bg-slate-800">
            Sin velocidad de demanda registrable en este alcance: el forecast aparecerá cuando haya stock de seguridad y lead times cargados.
          </p>
        )}
        {/* Salud del inventario: barra segmentada compacta */}
        <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
          <div className="flex flex-wrap justify-between gap-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">
            <span>Salud del inventario</span>
            <span className="tabular-nums">{data.health.total} SKUs en alcance</span>
          </div>
          {data.health.total > 0 ? (
            <>
              <div className="mt-2 flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" role="img" aria-label={`${data.health.critical} en quiebre, ${data.health.low} bajos, ${data.health.healthy} saludables`}>
                <div className="h-full bg-red-500" style={{ width: `${healthPct.critical}%` }} />
                <div className="h-full bg-amber-400" style={{ width: `${healthPct.low}%` }} />
                <div className="h-full bg-emerald-500" style={{ width: `${healthPct.healthy}%` }} />
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <span><span className="font-extrabold tabular-nums text-red-600">{data.health.critical}</span> quiebre</span>
                <span><span className="font-extrabold tabular-nums text-amber-600">{data.health.low}</span> bajo</span>
                <span><span className="font-extrabold tabular-nums text-emerald-600">{data.health.healthy}</span> saludable</span>
              </div>
            </>
          ) : (
            <p className="mt-2 text-xs text-slate-500">Sin SKUs en este alcance.</p>
          )}
        </div>
      </section>

      {/* Nivel 3: top 5 acciones inmediatas */}
      <section aria-label="Reabastecimiento prioritario" className="min-w-0 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 p-4 pb-0 sm:px-5">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Reabastecimiento prioritario · Top 5</h2>
          <Link href="/dashboard/reabastecimiento" className="whitespace-nowrap text-xs font-bold text-blue-600 hover:text-blue-800">
            Ver todo →
          </Link>
        </div>
        <div className="overflow-x-auto p-4 sm:px-5">
          {data.topActions.length === 0 ? (
            <p role="status" className="rounded-lg bg-slate-50 px-4 py-6 text-center text-[13px] text-slate-500 dark:bg-slate-800">
              Sin compras sugeridas en este alcance: ningún SKU bajo su punto de reorden.
            </p>
          ) : (
            <table className="w-full min-w-[640px] border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-500 dark:border-slate-700">
                  <th scope="col" className="py-2 pr-3 font-bold">SKU / Producto</th>
                  <th scope="col" className="py-2 pr-3 font-bold">Proveedor</th>
                  <th scope="col" className="py-2 pr-3 text-right font-bold">Cobertura</th>
                  <th scope="col" className="py-2 pr-3 text-right font-bold">A ordenar</th>
                  <th scope="col" className="py-2 pr-3 text-right font-bold">Inversión</th>
                  <th scope="col" className="py-2 text-right font-bold">Acción</th>
                </tr>
              </thead>
              <tbody>
                {data.topActions.map((a) => (
                  <tr key={a.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                    <td className="py-3 pr-3">
                      <div className="font-bold text-slate-900 dark:text-white">{a.productName}</div>
                      <div className="text-[11px] tabular-nums text-slate-500">{a.sku}</div>
                    </td>
                    <td className="whitespace-nowrap py-3 pr-3 text-slate-600 dark:text-slate-300">{a.provider}</td>
                    <td className="whitespace-nowrap py-3 pr-3 text-right font-extrabold tabular-nums text-red-600">
                      {a.coverageDays} días
                    </td>
                    <td className="whitespace-nowrap py-3 pr-3 text-right font-bold tabular-nums text-slate-900 dark:text-white">
                      {a.suggestedQty.toLocaleString('es-PE')} u
                    </td>
                    <td className="whitespace-nowrap py-3 pr-3 text-right tabular-nums text-slate-700 dark:text-slate-200">
                      {fmtPEN(a.investment)}
                    </td>
                    <td className="py-3 text-right">
                      <span className="inline-flex flex-nowrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleGenerateOC(a.id, a.sku)}
                          disabled={generatingId === a.id}
                          className="min-h-[36px] whitespace-nowrap rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-white dark:text-slate-900"
                        >
                          {generatingId === a.id ? 'Generando…' : 'Generar orden'}
                        </button>
                        <Link
                          href="/dashboard/financiamiento"
                          className="inline-flex min-h-[36px] items-center whitespace-nowrap rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
                        >
                          Financiar
                        </Link>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
