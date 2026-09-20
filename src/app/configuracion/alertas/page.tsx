'use client';

import React, { useState } from 'react';
import { BellRing, ShieldAlert, Sliders, CheckCircle2 } from 'lucide-react';
import styles from '@/app/dashboard/inventario/page.module.css';

export default function AlertasConfigPage() {
  const [leadTimeBuffer, setLeadTimeBuffer] = useState(2);
  const [criticalDaysThreshold, setCriticalDaysThreshold] = useState(5);
  const [safetyStockMultiplier, setSafetyStockMultiplier] = useState(1.25);
  const [autoEmailPO, setAutoEmailPO] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Ajustes de Alerta y Reorden</h1>
          <p className={styles.subtitle}>
            Calibración de umbrales preventivos de quiebre, buffers de reposición y generación automática de órdenes.
          </p>
        </div>
      </header>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>UMBRAL CRÍTICO (DÍAS)</span>
          <span className={styles.statValue} style={{ color: '#dc2626' }}>&lt; 5 Días</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>BUFFER LEAD TIME</span>
          <span className={styles.statValue}>+2 Días Adicionales</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>FACTOR DE SEGURIDAD</span>
          <span className={styles.statValue}>1.25x Desviación</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>GENERACIÓN AUTOMÁTICA OC</span>
          <span className={styles.statValue} style={{ color: '#16a34a' }}>Habilitada</span>
        </div>
      </div>

      <div className={styles.tableCard} style={{ padding: '28px', maxWidth: '720px' }}>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Umbral de Riesgo Crítico (Días Restantes de Stock)
            </label>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 6px 0' }}>
              Se emitirá alerta roja cuando el inventario proyectado cubra menos de este número de días.
            </p>
            <input
              type="number"
              min="1"
              max="30"
              className={styles.input}
              value={criticalDaysThreshold}
              onChange={(e) => setCriticalDaysThreshold(Number(e.target.value))}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>
              Buffer de Seguridad sobre Lead Time (Días de Holgura)
            </label>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 6px 0' }}>
              Días adicionales añadidos al tiempo de entrega del proveedor para prevenir demoras logísticas.
            </p>
            <input
              type="number"
              min="0"
              max="15"
              className={styles.input}
              value={leadTimeBuffer}
              onChange={(e) => setLeadTimeBuffer(Number(e.target.value))}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>
              Multiplicador de Stock de Seguridad
            </label>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 6px 0' }}>
              Factor aplicado sobre la variabilidad histórica de la demanda (1.0 = normal, 1.25 = alta protección).
            </p>
            <input
              type="number"
              step="0.05"
              min="1"
              max="2.5"
              className={styles.input}
              value={safetyStockMultiplier}
              onChange={(e) => setSafetyStockMultiplier(Number(e.target.value))}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
            <input
              type="checkbox"
              id="autoPO"
              checked={autoEmailPO}
              onChange={(e) => setAutoEmailPO(e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <label htmlFor="autoPO" style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', cursor: 'pointer' }}>
              Generar borrador de Orden de Compra automáticamente al alcanzar punto de reorden
            </label>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '10px' }}>
            <button type="submit" className={styles.btnPrimary}>
              Guardar Parámetros de Alerta
            </button>
            {saved && (
              <span style={{ fontSize: '13px', color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 size={16} /> ¡Parámetros guardados correctamente!
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
