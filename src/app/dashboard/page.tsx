'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import styles from './page.module.css';
import { PurchasingBrainSummary } from '@/types';

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialTab = searchParams?.get('tab') === 'predictiva' ? 'predictiva' : 'resumen';
  
  const [activeTab, setActiveTab] = useState<'resumen' | 'predictiva'>(initialTab);
  const [summary, setSummary] = useState<PurchasingBrainSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // IA Predictiva View States
  const [selectedSku, setSelectedSku] = useState('Aceite Primor Premium 1L');
  const [predictiveHorizon, setPredictiveHorizon] = useState<'30d' | '60d' | '90d' | '180d'>('30d');

  // Keep activeTab in sync with URL
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

  const loadSummary = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/dashboard/cerebro', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setSummary(data.summary);
      }
    } catch (err) {
      console.error('Error cargando resumen ejecutivo:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  // Real Sync Action
  const handleSyncAll = async () => {
    setSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await fetch('/api/integraciones/shopify/sync', { method: 'POST' });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setSyncFeedback(`Sincronización: ${data.message || data.error || 'Credenciales pendientes de configuración'}`);
      } else {
        setSyncFeedback(`✓ Sincronización exitosa: ${data.products_synced || 0} productos actualizados.`);
      }

      await loadSummary();
    } catch (err: any) {
      setSyncFeedback(`Error: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const hasActive = summary?.hasActiveIntegrations || false;

  return (
    <div className={styles.container}>
      
      {/* 1. Selector de Vistas Integradas (Tabs del Cerebro de Compras) */}
      <div className={styles.dashboardTabsNav}>
        <button 
          className={`${styles.dashTabBtn} ${activeTab === 'resumen' ? styles.dashTabBtnActive : ''}`}
          onClick={() => switchTab('resumen')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect><rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect></svg>
          Resumen Ejecutivo
        </button>
        <button 
          className={`${styles.dashTabBtn} ${activeTab === 'predictiva' ? styles.dashTabBtnActive : ''}`}
          onClick={() => switchTab('predictiva')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
          IA Predictiva & Forecast
        </button>
      </div>

      {/* Banner de Estado de Integración Real */}
      {!hasActive && !loading && (
        <div style={{
          background: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          borderRadius: '10px',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ width: '8px', height: '8px', background: '#d97706', borderRadius: '50%' }}></span>
              <strong style={{ color: '#92400e', fontSize: '13px' }}>Integraciones Pendientes de Configuración</strong>
            </div>
            <p style={{ color: '#78350f', fontSize: '12px', margin: 0 }}>
              No existen credenciales activas en base de datos. Para calcular riesgos, compras y demanda real, conecte Shopify, Mercado Libre o SAP.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <Link 
              href="/dashboard/integraciones"
              style={{
                background: '#0f172a',
                color: '#ffffff',
                padding: '8px 14px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                textDecoration: 'none'
              }}
            >
              Configurar Conectores
            </Link>
          </div>
        </div>
      )}

      {syncFeedback && (
        <div style={{
          background: syncFeedback.startsWith('✓') ? 'rgba(5, 150, 105, 0.08)' : 'rgba(220, 38, 38, 0.08)',
          border: `1px solid ${syncFeedback.startsWith('✓') ? 'rgba(5, 150, 105, 0.2)' : 'rgba(220, 38, 38, 0.2)'}`,
          color: syncFeedback.startsWith('✓') ? '#065f46' : '#991b1b',
          borderRadius: '8px',
          padding: '10px 16px',
          fontSize: '12px',
          fontWeight: 500
        }}>
          {syncFeedback}
        </div>
      )}

      {/* =========================================================================
          VISTA 1: RESUMEN EJECUTIVO (8 MÓDULOS DE COMPRAS)
          ========================================================================= */}
      {activeTab === 'resumen' && (
        <>
          {/* Módulos de Alto Impacto (Top Level) */}
          <div className={styles.gridTop}>
            {/* 1. Riesgo de Quiebre */}
            <div className={`${styles.card} ${styles.alertCard}`}>
              <div className={styles.cardHeader}>
                <h3>1. Riesgo de Quiebre</h3>
                <span className={hasActive && summary?.skusEnRiesgoCount ? styles.badgeAlert : styles.badgeNeutral}>
                  {hasActive && summary?.skusEnRiesgoCount ? 'Crítico' : 'Sin datos'}
                </span>
              </div>
              <div className={styles.cardValue}>
                {hasActive ? `${summary?.skusEnRiesgoCount || 0} SKUs` : '0 SKUs'}
              </div>
              <p className={styles.cardSub}>
                {hasActive && summary?.ventasEnRiesgoMonto
                  ? `S/ ${summary.ventasEnRiesgoMonto.toLocaleString()} en ventas en riesgo (próximos 7 días)`
                  : 'Pendiente de sincronización de inventario'}
              </p>
              {hasActive ? (
                <Link href="/dashboard/reabastecimiento" className={styles.btnAction}>
                  Ver detalles
                </Link>
              ) : (
                <Link href="/dashboard/integraciones" className={styles.btnActionSecondary}>
                  Conectar inventario
                </Link>
              )}
            </div>

            {/* 2. Inventario Inmovilizado */}
            <div className={`${styles.card} ${styles.warnCard}`}>
              <div className={styles.cardHeader}>
                <h3>2. Inventario Inmovilizado</h3>
                <span className={hasActive && summary?.inventarioInmovilizadoMonto ? styles.badgeWarn : styles.badgeNeutral}>
                  {hasActive && summary?.inventarioInmovilizadoMonto ? 'Atención' : 'Sin datos'}
                </span>
              </div>
              <div className={styles.cardValue}>
                {hasActive && summary?.inventarioInmovilizadoMonto
                  ? `S/ ${summary.inventarioInmovilizadoMonto.toLocaleString()}`
                  : 'S/ 0'}
              </div>
              <p className={styles.cardSub}>
                {hasActive && summary?.inventarioInmovilizadoMonto
                  ? `+${summary.porcentajeVariacionMensual}% vs mes anterior (Capital estancado > 90d)`
                  : 'Sin productos estancados registrados'}
              </p>
              <Link href="/dashboard/inventario" className={styles.btnActionSecondary}>
                {hasActive ? 'Liquidar stock' : 'Ver inventario'}
              </Link>
            </div>

            {/* 3. Compras Recomendadas */}
            <div className={`${styles.card} ${styles.successCard}`}>
              <div className={styles.cardHeader}>
                <h3>3. Compras Recomendadas</h3>
                <span className={hasActive && summary?.ordenesRecomendadasCount ? styles.badgeSuccess : styles.badgeNeutral}>
                  {hasActive && summary?.ordenesRecomendadasCount ? 'Óptimo' : 'Sin datos'}
                </span>
              </div>
              <div className={styles.cardValue}>
                {hasActive ? `${summary?.ordenesRecomendadasCount || 0} Órdenes` : '0 Órdenes'}
              </div>
              <p className={styles.cardSub}>
                {hasActive && summary?.confianzaForecastPromedio
                  ? `Para cubrir forecast de 30 días (Confianza: ${summary.confianzaForecastPromedio}%)`
                  : 'Requiere historial de ventas y demanda'}
              </p>
              {hasActive ? (
                <Link href="/dashboard/ordenes" className={styles.btnAction}>
                  Aprobar con 1-clic
                </Link>
              ) : (
                <Link href="/dashboard/integraciones" className={styles.btnActionSecondary}>
                  Habilitar forecast
                </Link>
              )}
            </div>
          </div>

          {/* Módulos Financieros */}
          <div className={styles.gridMid}>
            {/* 4. Capital Requerido */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3>4. Capital Requerido</h3>
                <span className={styles.badgeNeutral}>
                  {hasActive ? `${summary?.diasPlazo || 30} días` : 'No calculado'}
                </span>
              </div>
              <div className={styles.cardValue}>
                {hasActive && summary?.capitalRequeridoMonto
                  ? `S/ ${summary.capitalRequeridoMonto.toLocaleString()}`
                  : 'S/ 0'}
              </div>
              <div className={styles.progressBar}>
                <div 
                  className={styles.progressFill} 
                  style={{ width: `${hasActive ? summary?.porcentajeEjecucion || 0 : 0}%` }}
                />
              </div>
              <p className={styles.cardSub}>Para ejecutar compras recomendadas</p>
            </div>

            {/* 5. Financiamiento Disponible */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3>5. Financiamiento Disponible</h3>
                <span className={hasActive && summary?.estadoFinanciamiento === 'aprobado' ? styles.badgeSuccess : styles.badgeNeutral}>
                  {hasActive ? 'Aprobado' : 'Pendiente'}
                </span>
              </div>
              <div className={styles.cardValue}>
                {hasActive && summary?.financiamientoDisponibleMonto
                  ? `S/ ${summary.financiamientoDisponibleMonto.toLocaleString()}`
                  : 'S/ 0'}
              </div>
              <p className={styles.cardSub}>
                {hasActive
                  ? `Tasa: ${summary?.tasaMensual || 1.45}% mensual · Línea activa Pichincha`
                  : 'Línea de crédito sujeta a conexión con ERP'}
              </p>
              <Link href="/dashboard/financiamiento" className={styles.btnActionSecondary}>
                {hasActive ? 'Usar línea' : 'Ver requisitos'}
              </Link>
            </div>
          </div>

          {/* Módulos Analíticos Avanzados */}
          <div className={styles.gridBottom}>
            {/* 6. Forecast de 90 días */}
            <div className={`${styles.card} ${styles.span2}`}>
              <div className={styles.cardHeader}>
                <h3>6. Forecast de 90 días</h3>
              </div>
              {hasActive && summary?.forecast90Dias && summary.forecast90Dias.length > 0 ? (
                <div className={styles.chartPlaceholder}>
                  <div className={styles.chartBars}>
                    {summary.forecast90Dias.map((dp, idx) => (
                      <div key={idx} className={styles.bar} style={{ height: `${(dp.proyeccion / 35000) * 100}%` }}>
                        <span>{dp.mes}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{
                  padding: '30px 16px',
                  textAlign: 'center',
                  color: 'var(--muted)',
                  fontSize: '13px',
                  borderBottom: '1px solid var(--line)',
                  marginBottom: '16px'
                }}>
                  Conecte Shopify, Mercado Libre o SAP para proyectar la demanda con modelos de IA predictiva.
                </div>
              )}
              <p className={styles.cardSub}>
                {hasActive ? 'Proyección ajustada por estacionalidad y campañas Q4.' : 'Modelo predictivo en espera de datos históricos.'}
              </p>
            </div>

            {/* 7. Rentabilidad por SKU */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3>7. Rentabilidad por SKU</h3>
              </div>
              {hasActive && summary?.rentabilidadSKUs && summary.rentabilidadSKUs.length > 0 ? (
                <ul className={styles.list}>
                  {summary.rentabilidadSKUs.map((sku) => (
                    <li key={sku.sku}>
                      <span>{sku.nombre}</span>
                      <span className={sku.gmroi >= 20 ? styles.positive : styles.negative}>
                        {sku.gmroi}% GMROI
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>
                  Requiere sincronización de catálogo.
                </div>
              )}
            </div>

            {/* 8. Proveedores Críticos */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3>8. Proveedores Críticos</h3>
              </div>
              {hasActive && summary?.proveedoresCriticos && summary.proveedoresCriticos.length > 0 ? (
                <ul className={styles.list}>
                  {summary.proveedoresCriticos.map((prov) => (
                    <li key={prov.nombre}>
                      <span>{prov.nombre}</span>
                      <span className={prov.estado === 'alerta' ? styles.warning : styles.neutral}>
                        Lead: {prov.leadTimeDias} días
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>
                  Requiere órdenes de compra en firme.
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* =========================================================================
          VISTA 2: IA PREDICTIVA & FORECAST (INTEGRADA EN CEREBRO DE COMPRAS)
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

          {/* Forecast SVG Chart */}
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
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="histGrad" x1="0%" y1="0%" x2="0%" y2="1">
                    <stop offset="0%" stopColor="var(--muted)" stopOpacity="0.12" />
                    <stop offset="100%" stopColor="var(--muted)" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Historical Demand */}
                <path 
                  d="M 0 250 L 50 180 L 100 220 L 150 120 L 200 160 L 250 80 L 300 190 L 350 140 L 400 160 L 450 90 L 500 150 L 500 300 L 0 300 Z" 
                  fill="url(#histGrad)" 
                />
                <path 
                  d="M 0 250 L 50 180 L 100 220 L 150 120 L 200 160 L 250 80 L 300 190 L 350 140 L 400 160 L 450 90 L 500 150" 
                  fill="none" 
                  stroke="var(--muted)" 
                  strokeWidth="3" 
                  strokeDasharray="6 6"
                />

                {/* Forecast Demand */}
                <path 
                  d="M 500 150 L 550 180 L 600 70 L 650 110 L 700 90 L 750 40 L 800 160 L 850 180 L 900 120 L 950 170 L 1000 90 L 1000 300 L 500 300 Z" 
                  fill="url(#forecastGrad)" 
                />
                <path 
                  d="M 500 150 L 550 180 L 600 70 L 650 110 L 700 90 L 750 40 L 800 160 L 850 180 L 900 120 L 950 170 L 1000 90" 
                  fill="none" 
                  stroke="var(--accent)" 
                  strokeWidth="4" 
                />

                {/* Vertical Divider (Today) */}
                <line x1="500" y1="0" x2="500" y2="300" stroke="var(--primary)" strokeWidth="2" strokeDasharray="4 4" />
                <rect x="460" y="10" width="80" height="24" rx="12" fill="var(--primary)" />
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

          {/* Insights Algorítmicos */}
          <div className={styles.insightsBox}>
            <h3 className={styles.insightsTitle}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
              ¿Por qué predecimos demanda proyectada para {selectedSku}?
            </h3>
            <p className={styles.insightsText}>
              El modelo proyecta una <strong>media base de 94.0 u/día</strong> ajustada por un <strong>factor de tendencia (+33.5%)</strong> detectado en el último trimestre. 
              Se aplican multiplicadores de estacionalidad por fin de mes (1.28x) y quincena (1.18x).
              <br /><br />
              Considerando un <strong>Lead Time de 4 días</strong> del proveedor Alicorp y una volatilidad del 18%, el <strong>Stock de Seguridad se fijó en 56 unidades</strong>, estableciendo el <strong>Punto de Reorden (ROP) en 432 unidades</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Floating Sync Action */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
        <button 
          onClick={handleSyncAll}
          disabled={syncing}
          style={{
            background: 'var(--bg2)',
            border: '1px solid var(--line)',
            color: 'var(--ink)',
            padding: '8px 16px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
          {syncing ? 'Llamando APIs oficiales...' : 'Sincronizar Datos en Vivo'}
        </button>
      </div>

    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div style={{ padding: '32px', color: 'var(--muted)' }}>Cargando Cerebro de Compras...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
