'use client';

import { useState } from 'react';
import styles from './page.module.css';

export default function AjustesPage() {
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Configuración & Parámetros Operativos</h1>
        <p className={styles.subtitle}>
          Ajusta las políticas de inventario, márgenes de seguridad y datos fiscales de tu empresa.
        </p>
      </header>

      <form onSubmit={handleSave} className={styles.card}>
        <h2 className={styles.sectionTitle}>1. Datos de la Empresa</h2>
        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Razón Social</label>
            <input 
              type="text" 
              defaultValue="Distribuidora San Martín S.A.C." 
              className={styles.input} 
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>RUC / Identificación Fiscal</label>
            <input 
              type="text" 
              defaultValue="20601234567" 
              className={styles.input} 
            />
          </div>
        </div>

        <h2 className={styles.sectionTitle} style={{ marginTop: '16px' }}>2. Reglas del Algoritmo de Reposición</h2>
        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Lead Time General por Defecto</label>
            <input 
              type="number" 
              defaultValue={5} 
              className={styles.input} 
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Nivel de Servicio Deseado (SLA)</label>
            <select className={styles.select} defaultValue="95">
              <option value="90">90% (Menor stock de seguridad)</option>
              <option value="95">95% (Recomendado para consumo masivo)</option>
              <option value="98">98% (Alta exigencia)</option>
              <option value="99">99% (Cero quiebres / Stock crítico)</option>
            </select>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Moneda Principal</label>
            <select className={styles.select} defaultValue="PEN">
              <option value="PEN">PEN (Soles - S/)</option>
              <option value="USD">USD (Dólares - $)</option>
            </select>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Horizonte de Proyección por Defecto</label>
            <select className={styles.select} defaultValue="30">
              <option value="30">30 días</option>
              <option value="60">60 días</option>
              <option value="90">90 días</option>
              <option value="180">180 días</option>
            </select>
          </div>
        </div>

        <h2 className={styles.sectionTitle} style={{ marginTop: '16px' }}>3. Canales de Notificación Crítica</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label className={styles.checkboxRow}>
            <input type="checkbox" defaultChecked />
            Enviar alertas de quiebre inminente (&lt;3 días) por WhatsApp al Administrador de Compras.
          </label>
          <label className={styles.checkboxRow}>
            <input type="checkbox" defaultChecked />
            Enviar resumen semanal de capital inmovilizado al correo del CFO.
          </label>
        </div>

        <button type="submit" className={styles.btnPrimary}>
          {saved ? '✓ Cambios Guardados' : 'Guardar Configuración'}
        </button>
      </form>
    </div>
  );
}
