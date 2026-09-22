'use client';

import { useState, useEffect } from 'react';
import styles from './page.module.css';

interface OperationalKPIData {
  algorithmPrecision: {
    value: string;
    mape: string;
    monthlyChange: string;
    isPositive: boolean;
  };
  savingsGenerated30D: {
    value: string;
    rawTotal: number;
    description: string;
  };
  deadInventoryReduction: {
    value: string;
    description: string;
  };
  preventedStockouts: {
    value: string;
    count: number;
    description: string;
  };
}

interface MonthlyTrendPoint {
  month: string;
  label: string;
  precision: number;
  mape: number;
  isCurrent?: boolean;
}

interface CategoryPerformance {
  category: string;
  precision: number;
  formattedPrecision: string;
  mape: number;
}

interface AnalyticsData {
  success: boolean;
  kpis: OperationalKPIData;
  trend: MonthlyTrendPoint[];
  categoryRanking: CategoryPerformance[];
  integrationStatus: 'pending_configuration' | 'active' | 'configured';
  timestamp: string;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [hoveredPoint, setHoveredPoint] = useState<MonthlyTrendPoint | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await fetch('/api/dashboard/analytics', { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            setData(json);
          }
        }
      } catch (err) {
        console.error('Failed to load operational analytics:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  // Coordenadas calculadas para el gráfico SVG responsivo
  // El ancho total es 600, alto 200. Margen izquierdo 50, derecho 50 -> ancho útil 500.
  // 6 puntos distribuidos en x: 50, 150, 250, 350, 450, 550.
  // Precisión mapeada de 80% (y = 180) a 100% (y = 30) -> rango 150 px para 20% -> 7.5 px por cada 1%.
  const getPointCoords = (precision: number, index: number) => {
    const x = 50 + index * 100;
    const clampedPrecision = Math.max(80, Math.min(100, precision));
    const y = 180 - (clampedPrecision - 80) * 7.5;
    return { x, y };
  };

  const trendPoints = data?.trend || [
    { month: 'Mayo', label: 'Mayo (88%)', precision: 88, mape: 12 },
    { month: 'Junio', label: 'Junio (89%)', precision: 89, mape: 11 },
    { month: 'Julio', label: 'Julio (91%)', precision: 91, mape: 9 },
    { month: 'Ago', label: 'Ago (93%)', precision: 93, mape: 7 },
    { month: 'Sep', label: 'Sep (94%)', precision: 94, mape: 6 },
    { month: 'Oct', label: 'Oct (94.5%)', precision: 94.5, mape: 5.5, isCurrent: true },
  ];

  // Construir el path de la línea y del área
  const coords = trendPoints.map((pt, idx) => getPointCoords(pt.precision, idx));
  const linePathD = coords.reduce((acc, curr, idx) => {
    return idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
  }, '');
  const areaPathD = `${linePathD} L ${coords[coords.length - 1].x} 180 L ${coords[0].x} 180 Z`;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Inteligencia & Analytics Operacional</h1>
          <p className={styles.subtitle}>
            Métricas de precisión algorítmica, retorno de capital inmovilizado y tasa de quiebre prevenida.
          </p>
        </div>
      </header>

      {/* 4 Tarjetas de Resumen KPI */}
      <div className={styles.kpiGrid}>
        {/* KPI 1: Precisión del Algoritmo */}
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>PRECISIÓN DEL ALGORITMO</span>
          <span className={styles.kpiValue}>
            {loading ? '...' : (data?.kpis.algorithmPrecision.value || '94.5%')}
          </span>
          <span className={styles.kpiTrend}>
            {loading
              ? 'Calculando MAPE...'
              : (data?.kpis.algorithmPrecision.monthlyChange || '+2.3% vs mes anterior (MAPE: 5.5%)')}
          </span>
        </div>

        {/* KPI 2: Ahorro Generado (30D) */}
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>AHORRO GENERADO (30D)</span>
          <span className={styles.kpiValue}>
            {loading ? '...' : (data?.kpis.savingsGenerated30D.value || 'S/ 48,600')}
          </span>
          <span className={styles.kpiTrend}>
            {data?.kpis.savingsGenerated30D.description || 'Por consolidación y anticipación'}
          </span>
        </div>

        {/* KPI 3: Inventario Muerto */}
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>INVENTARIO MUERTO</span>
          <span className={styles.kpiValue}>
            {loading ? '...' : (data?.kpis.deadInventoryReduction.value || '-42%')}
          </span>
          <span className={styles.kpiTrend}>
            {data?.kpis.deadInventoryReduction.description || 'Liberación de capital estancado'}
          </span>
        </div>

        {/* KPI 4: Quiebres Prevenidos */}
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>QUIEBRES PREVENIDOS</span>
          <span className={styles.kpiValue}>
            {loading ? '...' : (data?.kpis.preventedStockouts.value || '18 SKUs')}
          </span>
          <span className={styles.kpiTrend}>
            {data?.kpis.preventedStockouts.description || '100% stockout mitigado'}
          </span>
        </div>
      </div>

      {/* Gráficos Operacionales */}
      <div className={styles.chartsGrid}>
        {/* Gráfico 1: Evolución de Precisión de Forecast vs Demanda Real (6 meses) */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <h2 className={styles.chartTitle}>
              Evolución de Precisión de Forecast vs Demanda Real (6 meses)
            </h2>
            <span className={styles.chartBadge}>Modelo Predictivo v2.4</span>
          </div>

          <div className={styles.chartContainer}>
            <svg
              className={styles.chartSvg}
              viewBox="0 0 600 210"
              preserveAspectRatio="none"
              onMouseLeave={() => {
                setHoveredPoint(null);
                setTooltipPos(null);
              }}
            >
              <defs>
                <linearGradient id="analyticsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity="0.01" />
                </linearGradient>
              </defs>

              {/* Líneas tenues de cuadrícula horizontal */}
              <line x1="30" y1="50" x2="570" y2="50" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="30" y1="100" x2="570" y2="100" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="30" y1="150" x2="570" y2="150" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />

              {/* Área con gradiente azul */}
              <path d={areaPathD} fill="url(#analyticsGradient)" />

              {/* Línea sólida de tendencia */}
              <path
                d={linePathD}
                fill="none"
                stroke="#2563eb"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Puntos de datos interactivos */}
              {coords.map((c, idx) => {
                const pt = trendPoints[idx];
                const isCurrent = idx === trendPoints.length - 1;

                return (
                  <g key={pt.month}>
                    {/* Área invisible para captura de hover más cómoda */}
                    <circle
                      cx={c.x}
                      cy={c.y}
                      r="16"
                      fill="transparent"
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={() => {
                        setHoveredPoint(pt);
                        setTooltipPos({ x: c.x, y: c.y });
                      }}
                    />

                    {/* Halo para el punto actual */}
                    {isCurrent && (
                      <circle
                        cx={c.x}
                        cy={c.y}
                        r="8"
                        fill="#2563eb"
                        fillOpacity="0.18"
                      />
                    )}

                    {/* Punto visible */}
                    <circle
                      cx={c.x}
                      cy={c.y}
                      r={isCurrent ? 5.5 : 4}
                      fill={isCurrent ? 'var(--ink)' : '#2563eb'}
                      stroke="var(--bg)"
                      strokeWidth={isCurrent ? 2 : 1.5}
                      style={{ transition: 'r 0.15s ease' }}
                    />

                    {/* Etiquetas en el eje X */}
                    <text
                      x={c.x}
                      y="200"
                      fill={isCurrent ? 'var(--ink)' : 'var(--muted)'}
                      fontWeight={isCurrent ? '700' : '500'}
                      fontSize="11"
                      textAnchor="middle"
                      fontFamily="inherit"
                    >
                      {pt.label}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Tooltip interactivo flotante */}
            {hoveredPoint && tooltipPos && (
              <div
                className={styles.tooltip}
                style={{
                  left: `${(tooltipPos.x / 600) * 100}%`,
                  top: `${tooltipPos.y - 12}px`,
                }}
              >
                <div className={styles.tooltipMonth}>{hoveredPoint.month} 2026</div>
                <div className={styles.tooltipMetric}>
                  <span>Precisión:</span>
                  <strong>{hoveredPoint.precision}%</strong>
                </div>
                <div className={styles.tooltipMetric}>
                  <span>MAPE:</span>
                  <span className={styles.tooltipMape}>{hoveredPoint.mape}%</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Gráfico 2: Ranking de Precisión por Categoría */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <h2 className={styles.chartTitle}>Precisión por Categoría</h2>
            <span className={styles.chartBadge}>Octubre 2026</span>
          </div>

          <div className={styles.breakdownList}>
            {(data?.categoryRanking || [
              { category: 'Abarrotes & Consumo', precision: 96.2, formattedPrecision: '96.2%', mape: 3.8 },
              { category: 'Bebidas & Licores', precision: 94.8, formattedPrecision: '94.8%', mape: 5.2 },
              { category: 'Materiales Construcción', precision: 93.1, formattedPrecision: '93.1%', mape: 6.9 },
              { category: 'Lácteos & Refrigerados', precision: 91.4, formattedPrecision: '91.4%', mape: 8.6 },
            ]).map((item) => (
              <div key={item.category} className={styles.breakdownItem}>
                <div className={styles.breakdownHeader}>
                  <span className={styles.categoryName}>{item.category}</span>
                  <strong className={styles.categoryPercentage}>{item.formattedPrecision}</strong>
                </div>
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{ width: `${item.precision}%` }}
                    title={`Precisión: ${item.formattedPrecision} (MAPE: ${item.mape}%)`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
