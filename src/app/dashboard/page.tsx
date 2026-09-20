'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import styles from './page.module.css';
import { PurchasingBrainSummary } from '@/types';

export default function DashboardPage() {
  const [summary, setSummary] = useState<PurchasingBrainSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

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
      // Trigger real sync across configured providers
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
