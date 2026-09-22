'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import styles from './page.module.css';

interface ExecutiveData {
  summary: {
    totalSkus: number;
    stockoutRiskCount: number;
    deadStockAmount: number;
    recommendedPurchaseAmount: number;
    availableCreditLine: number;
    forecastAccuracy: number;
  };
  modules: {
    riesgoQuiebre: Array<{
      id: string;
      sku: string;
      name: string;
      currentStock: number;
      safetyStock: number;
      daysRemaining: number;
      leadTimeDays: number;
      urgency: 'CRITICAL' | 'WARNING' | 'STABLE';
    }>;
    inventarioInmovilizado: Array<{
      id: string;
      sku: string;
      name: string;
      deadQuantity: number;
      capitalTiedUp: number;
      daysInactive: number;
    }>;
    comprasRecomendadas: Array<{
      id: string;
      supplierName: string;
      sku: string;
      productName: string;
      suggestedQuantity: number;
      unitCost: number;
      totalCost: number;
      priority: 'HIGH' | 'MEDIUM' | 'LOW';
    }>;
    capitalRequerido: {
      totalRequired: number;
      immediate7Days: number;
      horizon30Days: number;
      currency: string;
    };
    financiamientoDisponible: Array<{
      id: string;
      bankName: string;
      totalLine: number;
      availableLine: number;
      monthlyRate: number;
      status: string;
    }>;
    forecast90Dias: Array<{
      month: string;
      projectedDemand: number;
      actualHistorical: number;
      lowerBound: number;
      upperBound: number;
    }>;
    rentabilidadSKU: Array<{
      sku: string;
      name: string;
      unitCost: number;
      unitPrice: number;
      marginPercent: number;
      totalRevenue: number;
    }>;
    proveedoresCriticos: Array<{
      id: string;
      name: string;
      leadTimeDays: number;
      activePOs: number;
      reliabilityScore: number;
      integrationType: string;
    }>;
  };
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialTab = searchParams?.get('tab') === 'predictiva' ? 'predictiva' : 'resumen';

  const [activeTab, setActiveTab] = useState<'resumen' | 'predictiva'>(initialTab);
  const [data, setData] = useState<ExecutiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // IA Predictiva View States
  const [selectedSku, setSelectedSku] = useState('Aceite Primor Premium 1L');
  const [predictiveHorizon, setPredictiveHorizon] = useState<'30d' | '60d' | '90d' | '180d'>('90d');

  useEffect(() => {
    const tabFromUrl = searchParams?.get('tab');
    if (tabFromUrl === 'predictiva') {
      setActiveTab('predictiva');
    } else {
      setActiveTab('resumen');
    }
  }, [searchParams]);

  const switchTab = (tab: 'resumen' | 'predictiva') => {
    setActiveTab(tab);
    if (tab === 'predictiva') {
      router.replace('/dashboard?tab=predictiva', { scroll: false });
    } else {
      router.replace('/dashboard', { scroll: false });
    }
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/dashboard/cerebro', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.summary) {
          setData(json);
        }
      }
    } catch (err) {
      console.error('Error cargando métricas ejecutivas:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSyncAll = async () => {
    setSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await fetch('/api/integraciones/shopify/sync', { method: 'POST' });
      const resData = await res.json().catch(() => ({}));

      if (!res.ok) {
        setSyncFeedback(`Integración: ${resData.message || resData.error || 'Credenciales pendientes de configuración en Supabase.'}`);
      } else {
        setSyncFeedback(`✓ Sincronización en vivo completada exitosamente.`);
      }

      await loadData();
    } catch (err: any) {
      setSyncFeedback(`Error: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const summary = data?.summary;
  const modules = data?.modules;

  return (
    <div className={styles.container}>
      {/* Encabezado Ejecutivo: Responder en <30s */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#3b82f6', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              CENTRO DE CONTROL EJECUTIVO · B2B SAAS ENTERPRISE
            </span>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--ink)', margin: '4px 0 6px 0', letterSpacing: '-0.02em' }}>
              Cerebro de Compras & Financiamiento
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0, maxWidth: '720px' }}>
              ¿Qué está pasando? <strong>{summary?.stockoutRiskCount || 0} SKUs en riesgo</strong>. 
              ¿Qué va a pasar? Demandas por <strong>S/ {(summary?.recommendedPurchaseAmount || 0).toLocaleString()}</strong> en 30 días. 
              ¿Qué debo hacer? Aprobar OC recomendadas y activar líneas de crédito.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleSyncAll}
              disabled={syncing}
              style={{
                background: 'var(--primary)',
                color: 'var(--bg)',
                border: 'none',
                padding: '9px 16px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
              {syncing ? 'Sincronizando...' : 'Sincronizar APIs Oficiales'}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs del Dashboard */}
      <div className={styles.dashboardTabsNav}>
        <button
          className={`${styles.dashTabBtn} ${activeTab === 'resumen' ? styles.dashTabBtnActive : ''}`}
          onClick={() => switchTab('resumen')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect><rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect></svg>
          Centro de Control (8 Módulos)
        </button>
        <button
          className={`${styles.dashTabBtn} ${activeTab === 'predictiva' ? styles.dashTabBtnActive : ''}`}
          onClick={() => switchTab('predictiva')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
          IA Predictiva & Forecast (90 Días)
        </button>
      </div>

      {syncFeedback && (
        <div style={{
          background: syncFeedback.startsWith('✓') ? 'rgba(5, 150, 105, 0.08)' : 'rgba(220, 38, 38, 0.08)',
          border: `1px solid ${syncFeedback.startsWith('✓') ? 'rgba(5, 150, 105, 0.2)' : 'rgba(220, 38, 38, 0.2)'}`,
          color: syncFeedback.startsWith('✓') ? 'var(--success)' : 'var(--danger)',
          borderRadius: '8px',
          padding: '10px 16px',
          fontSize: '12px',
          fontWeight: 500,
          marginBottom: '16px'
        }}>
          {syncFeedback}
        </div>
      )}

      {/* =========================================================================
          VISTA 1: RESUMEN EJECUTIVO (8 MÓDULOS DE COMPRAS ENTERPRISE)
          ========================================================================= */}
      {activeTab === 'resumen' && (
        <>
          {/* Módulos Superiores (Riesgo, Inmovilizado, Recomendadas) */}
          <div className={styles.gridTop}>
            {/* MÓDULO 1: Riesgo de Quiebre */}
            <div className={`${styles.card} ${styles.alertCard}`}>
              <div className={styles.cardHeader}>
                <h3>1. Riesgo de Quiebre</h3>
                <span className={styles.badgeAlert}>
                  {modules?.riesgoQuiebre?.length || 0} Críticos
                </span>
              </div>
              <div className={styles.cardValue}>
                {modules?.riesgoQuiebre?.length || 0} SKUs
              </div>
              <p className={styles.cardSub}>Stock por debajo del Lead Time de reposición (&lt;5 días)</p>
              
              <ul className={styles.list} style={{ marginTop: '12px' }}>
                {modules?.riesgoQuiebre.map((item) => (
                  <li key={item.id}>
                    <span style={{ fontSize: '12px', fontWeight: 600 }}>{item.name}</span>
                    <span className={styles.negative} style={{ fontSize: '11px' }}>
                      {item.daysRemaining}d restantes
                    </span>
                  </li>
                ))}
              </ul>
              <Link href="/dashboard/reabastecimiento" className={styles.btnAction} style={{ marginTop: '12px' }}>
                Ver Análisis Preventivo
              </Link>
            </div>

            {/* MÓDULO 2: Inventario Inmovilizado */}
            <div className={`${styles.card} ${styles.warnCard}`}>
              <div className={styles.cardHeader}>
                <h3>2. Inventario Inmovilizado</h3>
                <span className={styles.badgeWarn}>Capital Estancado</span>
              </div>
              <div className={styles.cardValue}>
                S/ {(summary?.deadStockAmount || 0).toLocaleString()}
              </div>
              <p className={styles.cardSub}>Capital atascado en ítems sin movimiento &gt;60 días</p>
              
              <ul className={styles.list} style={{ marginTop: '12px' }}>
                {modules?.inventarioInmovilizado.map((item) => (
                  <li key={item.id}>
                    <span style={{ fontSize: '12px' }}>{item.name}</span>
                    <span className={styles.warning} style={{ fontSize: '11px' }}>
                      S/ {item.capitalTiedUp.toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
              <Link href="/dashboard/inventario" className={styles.btnActionSecondary} style={{ marginTop: '12px' }}>
                Liquidar Stock Inactivo
              </Link>
            </div>

            {/* MÓDULO 3: Compras Recomendadas */}
            <div className={`${styles.card} ${styles.successCard}`}>
              <div className={styles.cardHeader}>
                <h3>3. Compras Recomendadas</h3>
                <span className={styles.badgeSuccess}>Sugerido por IA</span>
              </div>
              <div className={styles.cardValue}>
                {modules?.comprasRecomendadas?.length || 0} Órdenes
              </div>
              <p className={styles.cardSub}>Generación JIT basada en demanda real proyectada</p>
              
              <ul className={styles.list} style={{ marginTop: '12px' }}>
                {modules?.comprasRecomendadas.map((item) => (
                  <li key={item.id}>
                    <span style={{ fontSize: '12px' }}>{item.productName} ({item.suggestedQuantity}u)</span>
                    <span className={styles.positive} style={{ fontSize: '11px' }}>
                      S/ {item.totalCost.toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
              <Link href="/dashboard/ordenes" className={styles.btnAction} style={{ marginTop: '12px' }}>
                Aprobar OC con 1-Clic
              </Link>
            </div>
          </div>

          {/* Módulos Intermedios (Capital y Financiamiento) */}
          <div className={styles.gridMid}>
            {/* MÓDULO 4: Capital Requerido */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3>4. Capital Requerido</h3>
                <span className={styles.badgeNeutral}>Horizonte 30d</span>
              </div>
              <div className={styles.cardValue}>
                S/ {(modules?.capitalRequerido?.totalRequired || 0).toLocaleString()}
              </div>
              <div className={styles.progressBar} style={{ margin: '12px 0 8px 0' }}>
                <div className={styles.progressFill} style={{ width: '60%' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--muted)' }}>
                <span>Inmediato (7 días): S/ {(modules?.capitalRequerido?.immediate7Days || 0).toLocaleString()}</span>
                <span>Proyectado (30 días): S/ {(modules?.capitalRequerido?.horizon30Days || 0).toLocaleString()}</span>
              </div>
            </div>

            {/* MÓDULO 5: Financiamiento Disponible */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3>5. Financiamiento Disponible</h3>
                <span className={styles.badgeSuccess}>Línea Rotativa</span>
              </div>
              <div className={styles.cardValue}>
                S/ {(summary?.availableCreditLine || 0).toLocaleString()}
              </div>
              <ul className={styles.list} style={{ marginTop: '12px' }}>
                {modules?.financiamientoDisponible.map((line) => (
                  <li key={line.id}>
                    <span style={{ fontSize: '12px' }}>{line.bankName}</span>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--success)' }}>
                      S/ {line.availableLine.toLocaleString()} ({(line.monthlyRate * 100).toFixed(2)}%/mes)
                    </span>
                  </li>
                ))}
              </ul>
              <Link href="/dashboard/financiamiento" className={styles.btnActionSecondary} style={{ marginTop: '12px' }}>
                Solicitar Desembolso
              </Link>
            </div>
          </div>

          {/* Módulos Avanzados (Forecast 90d, Rentabilidad SKU, Proveedores Críticos) */}
          <div className={styles.gridBottom}>
            {/* MÓDULO 6: Forecast de 90 Días */}
            <div className={`${styles.card} ${styles.span2}`}>
              <div className={styles.cardHeader}>
                <h3>6. Forecast de 90 Días (Proyección Algorítmica)</h3>
                <span className={styles.badgeSuccess}>99.4% Exactitud</span>
              </div>
              
              <div className={styles.chartPlaceholder} style={{ margin: '16px 0' }}>
                <div className={styles.chartBars}>
                  {modules?.forecast90Dias.map((fc, idx) => (
                    <div key={idx} className={styles.bar} style={{ height: `${(fc.projectedDemand / 6000) * 100}%` }}>
                      <span style={{ bottom: '-22px', fontSize: '11px', fontWeight: 600, color: 'var(--muted)' }}>{fc.month}</span>
                    </div>
                  ))}
                </div>
              </div>
              <p className={styles.cardSub}>
                Modelos de Deep Learning entrenados con patrones históricos de consumo y factores de estacionalidad.
              </p>
            </div>

            {/* MÓDULO 7: Rentabilidad por SKU */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3>7. Rentabilidad por SKU</h3>
                <span className={styles.badgeNeutral}>Top Margen %</span>
              </div>
              <ul className={styles.list} style={{ marginTop: '12px' }}>
                {modules?.rentabilidadSKU.map((sku) => (
                  <li key={sku.sku}>
                    <span style={{ fontSize: '12px' }}>{sku.name}</span>
                    <span className={styles.positive} style={{ fontSize: '11px' }}>
                      {sku.marginPercent}% Margen
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* MÓDULO 8: Proveedores Críticos */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3>8. Proveedores Críticos</h3>
                <span className={styles.badgeNeutral}>Lead Time SLA</span>
              </div>
              <ul className={styles.list} style={{ marginTop: '12px' }}>
                {modules?.proveedoresCriticos.map((sup) => (
                  <li key={sup.id}>
                    <span style={{ fontSize: '12px' }}>{sup.name}</span>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#3b82f6' }}>
                      {sup.leadTimeDays}d Lead Time ({sup.reliabilityScore}%)
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}

      {/* =========================================================================
          VISTA 2: IA PREDICTIVA & FORECAST
          ========================================================================= */}
      {activeTab === 'predictiva' && (
        <div className={styles.predictivaCard}>
          <div className={styles.controlsRow}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>SKU a Analizar:</label>
              <select
                className={styles.selectSku}
                value={selectedSku}
                onChange={(e) => setSelectedSku(e.target.value)}
              >
                <option value="Aceite Primor Premium 1L">Aceite Primor Premium 1L (SKU-ALI-001)</option>
                <option value="Arroz Costeño 5kg">Arroz Costeño 5kg (SKU-COS-002)</option>
                <option value="Azúcar Rubia Cartavio 1kg">Azúcar Rubia Cartavio 1kg (SKU-CAR-003)</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600 }}>Horizonte:</span>
              <div className={styles.segmentedControl}>
                <button
                  className={`${styles.segment} ${predictiveHorizon === '30d' ? styles.segmentActive : ''}`}
                  onClick={() => setPredictiveHorizon('30d')}
                >
                  30d
                </button>
                <button
                  className={`${styles.segment} ${predictiveHorizon === '60d' ? styles.segmentActive : ''}`}
                  onClick={() => setPredictiveHorizon('60d')}
                >
                  60d
                </button>
                <button
                  className={`${styles.segment} ${predictiveHorizon === '90d' ? styles.segmentActive : ''}`}
                  onClick={() => setPredictiveHorizon('90d')}
                >
                  90d
                </button>
                <button
                  className={`${styles.segment} ${predictiveHorizon === '180d' ? styles.segmentActive : ''}`}
                  onClick={() => setPredictiveHorizon('180d')}
                >
                  180d
                </button>
              </div>
            </div>
          </div>

          <div className={styles.chartWrapper}>
            <div className={styles.yAxis}>
              <span>150u</span>
              <span>120u</span>
              <span>90u</span>
              <span>60u</span>
              <span>30u</span>
              <span>0u</span>
            </div>

            <div className={styles.chartArea}>
              <div className={styles.gridLines}>
                <div></div><div></div><div></div><div></div><div></div>
              </div>

              <svg className={styles.svgChart} viewBox="0 0 1000 300" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="forecastGrad" x1="0%" y1="0%" x2="0%" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="histGrad" x1="0%" y1="0%" x2="0%" y2="1">
                    <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.12" />
                    <stop offset="100%" stopColor="#94a3b8" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                <path
                  d="M 0 250 L 50 180 L 100 220 L 150 120 L 200 160 L 250 80 L 300 190 L 350 140 L 400 160 L 450 90 L 500 150 L 500 300 L 0 300 Z"
                  fill="url(#histGrad)"
                />
                <path
                  d="M 0 250 L 50 180 L 100 220 L 150 120 L 200 160 L 250 80 L 300 190 L 350 140 L 400 160 L 450 90 L 500 150"
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="3"
                  strokeDasharray="6 6"
                />

                <path
                  d="M 500 150 L 550 180 L 600 70 L 650 110 L 700 90 L 750 40 L 800 160 L 850 180 L 900 120 L 950 170 L 1000 90 L 1000 300 L 500 300 Z"
                  fill="url(#forecastGrad)"
                />
                <path
                  d="M 500 150 L 550 180 L 600 70 L 650 110 L 700 90 L 750 40 L 800 160 L 850 180 L 900 120 L 950 170 L 1000 90"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="4"
                />

                <line x1="500" y1="0" x2="500" y2="300" stroke="var(--ink)" strokeWidth="2" strokeDasharray="4 4" />
                <rect x="460" y="10" width="80" height="24" rx="12" fill="var(--ink)" />
                <text x="500" y="26" fill="var(--bg)" fontSize="12" fontWeight="600" textAnchor="middle">HOY</text>
              </svg>

              <div className={styles.xAxis}>
                <span>09-01</span>
                <span>09-08</span>
                <span>09-15</span>
                <span>09-22</span>
                <span className={styles.forecastDate}>09-29</span>
                <span className={styles.forecastDate}>10-06</span>
                <span className={styles.forecastDate}>10-13</span>
                <span className={styles.forecastDate}>10-20</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div style={{ padding: '32px', color: 'var(--muted)' }}>Cargando Centro de Control Ejecutivo...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
