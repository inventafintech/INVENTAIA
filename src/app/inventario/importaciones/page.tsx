'use client';

import React, { useState } from 'react';
import { Download, Ship, Anchor, CheckCircle2, AlertCircle } from 'lucide-react';
import styles from '@/app/dashboard/inventario/page.module.css';

const IMPORTS = [
  { id: 'IMP-2026-021', container: 'MSKU-789012-3', origin: 'Santos, Brasil', blNumber: 'BL-BR-2026-0091', eta: '2026-09-28', port: 'DP World Callao', cargo: 'Aceite de Soya Bruto (40 TN)', customsStatus: 'En Tránsito Marítimo', valueUSD: '$ 48,500' },
  { id: 'IMP-2026-020', container: 'TGHU-441209-1', origin: 'Buenos Aires, Argentina', blNumber: 'BL-AR-2026-0814', eta: '2026-09-24', port: 'APM Terminals Callao', cargo: 'Harina de Trigo Premium (60 TN)', customsStatus: 'Canal Naranja (Revisión)', valueUSD: '$ 62,000' },
  { id: 'IMP-2026-019', container: 'CMAU-901182-8', origin: 'Cartagena, Colombia', blNumber: 'BL-CO-2026-0511', eta: '2026-09-21', port: 'DP World Callao', cargo: 'Envases PET 1L y Tapas (120k u)', customsStatus: 'Levante Autorizado (Nacionalizado)', valueUSD: '$ 28,400' },
];

export default function ImportacionesPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = IMPORTS.filter(imp =>
    imp.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    imp.container.toLowerCase().includes(searchTerm.toLowerCase()) ||
    imp.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
    imp.cargo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Importaciones y Comercio Exterior</h1>
          <p className={styles.subtitle}>
            Trazabilidad de embarques internacionales, contenedores marítimos, desaduanaje y fechas estimadas de arribo (ETA).
          </p>
        </div>
      </header>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>EMBARQUES EN CURSO</span>
          <span className={styles.statValue}>3 Contenedores</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>VALOR FOB EN TRÁNSITO</span>
          <span className={styles.statValue}>$ 138,900 USD</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>PRÓXIMO ARRIBO A PUERTO</span>
          <span className={styles.statValue} style={{ color: 'var(--color-forest-ink)' }}>En 1 Día</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>ESTADO ADUANERO SUNAT</span>
          <span className={styles.statValue} style={{ color: '#16a34a' }}>Sin Incidentes</span>
        </div>
      </div>

      <div className={styles.controls}>
        <div className={styles.searchBox}>
          <input
            type="text"
            placeholder="Buscar por ID, contenedor, origen o carga..."
            className={styles.input}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ID IMPORT</th>
              <th>CONTENEDOR / B/L</th>
              <th>ORIGEN</th>
              <th>CARGA DECLARADA</th>
              <th>ETA CALLAO</th>
              <th>VALOR FOB</th>
              <th>ESTADO ADUANERO</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((imp) => (
              <tr key={imp.id}>
                <td className={styles.skuCode}>{imp.id}</td>
                <td>
                  <strong style={{ color: 'var(--color-obsidian)' }}>{imp.container}</strong>
                  <div style={{ fontSize: '11px', color: 'var(--color-slate)' }}>{imp.blNumber}</div>
                </td>
                <td className={styles.categoryName}>{imp.origin}</td>
                <td className={styles.productName}><strong>{imp.cargo}</strong></td>
                <td><strong style={{ color: 'var(--color-forest-ink)' }}>{imp.eta}</strong></td>
                <td>{imp.valueUSD}</td>
                <td>
                  {imp.customsStatus.includes('Levante') ? (
                    <span className={styles.badgeGood}>{imp.customsStatus}</span>
                  ) : imp.customsStatus.includes('Naranja') ? (
                    <span className={styles.badgeWarning}>{imp.customsStatus}</span>
                  ) : (
                    <span className={styles.badgeGood}>{imp.customsStatus}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
