'use client';

import { useState } from 'react';
import { Sparkles, Calculator } from 'lucide-react';
import styles from '@/app/dashboard/inventario/page.module.css';

export default function PonmeAPruebaPage() {
  const [dailyDemand, setDailyDemand] = useState(45);
  const [currentStock, setCurrentStock] = useState(150);
  const [leadTime, setLeadTime] = useState(4);
  const [safetyBuffer, setSafetyBuffer] = useState(2);

  // Cálculos reactivos de la IA
  const daysRemaining = dailyDemand > 0 ? (currentStock / dailyDemand).toFixed(1) : '999';
  const effectiveLeadTime = leadTime + safetyBuffer;
  const reorderPoint = dailyDemand * effectiveLeadTime;
  const isStockoutRisk = Number(daysRemaining) <= effectiveLeadTime;
  const suggestedOrderQty = Math.max(0, (reorderPoint * 2) - currentStock);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Ponme a Prueba · Simulador de IA Predictiva</h1>
          <p className={styles.subtitle}>
            Prueba en vivo el algoritmo de cálculo de quiebre de stock, punto de reorden y generación de OC.
          </p>
        </div>
      </header>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>DÍAS DE STOCK RESTANTES</span>
          <span className={styles.statValue} style={{ color: isStockoutRisk ? 'var(--color-alarm-red)' : '#16a34a' }}>
            {daysRemaining} Días
          </span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>PUNTO DE REORDEN (ROP)</span>
          <span className={styles.statValue}>{reorderPoint} Unidades</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>DIAGNÓSTICO PREVENTIVO</span>
          <span className={styles.statValue} style={{ color: isStockoutRisk ? 'var(--color-alarm-red)' : '#16a34a', fontSize: '18px' }}>
            {isStockoutRisk ? '⚠️ Riesgo Inminente' : '✓ Stock Seguro'}
          </span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>COMPRA SUGERIDA IA</span>
          <span className={styles.statValue}>{suggestedOrderQty} u</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', maxWidth: '1000px' }}>
        <div className={styles.tableCard} style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-obsidian)', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calculator size={18} color="var(--color-forest-ink)" /> Variables de Simulación
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Demanda Promedio Diaria (unidades/día)</label>
              <input
                type="number"
                min="1"
                max="5000"
                className={styles.input}
                style={{ width: '100%' }}
                value={dailyDemand}
                onChange={(e) => setDailyDemand(Math.max(1, Number(e.target.value)))}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Stock Físico Actual (unidades en almacén)</label>
              <input
                type="number"
                min="0"
                max="50000"
                className={styles.input}
                style={{ width: '100%' }}
                value={currentStock}
                onChange={(e) => setCurrentStock(Math.max(0, Number(e.target.value)))}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Lead Time del Proveedor (días que demora en entregar)</label>
              <input
                type="number"
                min="1"
                max="60"
                className={styles.input}
                style={{ width: '100%' }}
                value={leadTime}
                onChange={(e) => setLeadTime(Math.max(1, Number(e.target.value)))}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Buffer de Seguridad (días de contingencia)</label>
              <input
                type="number"
                min="0"
                max="30"
                className={styles.input}
                style={{ width: '100%' }}
                value={safetyBuffer}
                onChange={(e) => setSafetyBuffer(Math.max(0, Number(e.target.value)))}
              />
            </div>
          </div>
        </div>

        <div className={styles.tableCard} style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-obsidian)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} color="#8b5cf6" /> Explicación del Algoritmo
            </h3>
            <div style={{ fontSize: '13px', color: 'var(--color-charcoal)', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p>
                <strong>1. Días Restantes:</strong> Tu stock actual ({currentStock} u) dividido entre el ritmo de venta ({dailyDemand} u/día) indica que te quedan <strong>{daysRemaining} días</strong> de inventario.
              </p>
              <p>
                <strong>2. Plazo Crítico:</strong> Tu proveedor demora {leadTime} días + {safetyBuffer} días de buffer = <strong>{effectiveLeadTime} días</strong> para reabastecerte.
              </p>
              <p>
                <strong>3. Veredicto:</strong> {isStockoutRisk ? (
                  <span style={{ color: 'var(--color-alarm-red)', fontWeight: 600 }}>
                    ¡Alerta de quiebre! Te quedan {daysRemaining} días de stock, pero reabastecer toma {effectiveLeadTime} días. Si no compras hoy, quebrarás stock en {(effectiveLeadTime - Number(daysRemaining)).toFixed(1)} días.
                  </span>
                ) : (
                  <span style={{ color: '#16a34a', fontWeight: 600 }}>
                    ¡Todo bajo control! Tu stock ({daysRemaining} días) supera el tiempo necesario de reposición ({effectiveLeadTime} días).
                  </span>
                )}
              </p>
            </div>
          </div>

          <div style={{ background: 'var(--color-paper)', padding: '14px 16px', borderRadius: '10px', border: '1px solid var(--color-fog)', marginTop: '16px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-slate)', textTransform: 'uppercase' }}>
              ACCIÓN RECOMENDADA POR EL CEREBRO DE COMPRAS
            </span>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-obsidian)', marginTop: '4px' }}>
              {isStockoutRisk ? `Generar Orden de Compra urgente por ${suggestedOrderQty} unidades` : 'No requiere compras inmediatas'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
