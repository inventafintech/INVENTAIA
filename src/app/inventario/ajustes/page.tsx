'use client';

import { useState } from 'react';
import styles from '@/app/dashboard/inventario/page.module.css';

const ADJUSTMENTS = [
  { id: 'AJ-101', date: '2026-09-18', sku: 'SKU-ALI-001', product: 'Aceite Primor Premium 1L', type: 'Salida por Merma', qty: -12, reason: 'Envases dañados en transporte', user: 'carlos.m@inventa.ai', status: 'Aprobado' },
  { id: 'AJ-102', date: '2026-09-17', sku: 'SKU-COS-002', product: 'Arroz Costeño 5kg', type: 'Ajuste Conteo Físico', qty: +25, reason: 'Diferencia en inventario cíclico', user: 'marcos.v@inventa.ai', status: 'Aprobado' },
  { id: 'AJ-103', date: '2026-09-15', sku: 'SKU-CAR-003', product: 'Azúcar Rubia Cartavio 1kg', type: 'Corrección de Ingreso', qty: -5, reason: 'Error de tipeo en nota de recepción', user: 'ana.p@inventa.ai', status: 'Aprobado' },
  { id: 'AJ-104', date: '2026-09-12', sku: 'SKU-GLO-004', product: 'Leche Gloria Azul 400g', type: 'Muestra Comercial', qty: -6, reason: 'Muestra entregada a cliente mayorista', user: 'carlos.m@inventa.ai', status: 'Aprobado' },
];

export default function AjustesStockPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = ADJUSTMENTS.filter(aj =>
    aj.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
    aj.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    aj.reason.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Ajustes de Stock e Inventario</h1>
          <p className={styles.subtitle}>
            Registro de mermas, conteos físicos cíclicos, correcciones de stock y auditoría de movimientos manuales.
          </p>
        </div>
      </header>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>AJUSTES DEL MES</span>
          <span className={styles.statValue}>4 Registros</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>MERMAS REGISTRADAS</span>
          <span className={styles.statValue}>-18 Unidades</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>EXACTITUD DE REGISTRO (IRA)</span>
          <span className={styles.statValue} style={{ color: '#16a34a' }}>99.2%</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>ESTADO DE AUDITORÍA</span>
          <span className={styles.statValue} style={{ color: '#16a34a' }}>Al día</span>
        </div>
      </div>

      <div className={styles.controls}>
        <div className={styles.searchBox}>
          <input
            type="text"
            placeholder="Buscar por producto, SKU o motivo de ajuste..."
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
              <th>ID AJUSTE</th>
              <th>FECHA</th>
              <th>PRODUCTO / SKU</th>
              <th>TIPO DE AJUSTE</th>
              <th>CANTIDAD</th>
              <th>MOTIVO / OBSERVACIÓN</th>
              <th>RESPONSABLE</th>
              <th>ESTADO</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((aj) => (
              <tr key={aj.id}>
                <td className={styles.skuCode}>{aj.id}</td>
                <td>{aj.date}</td>
                <td className={styles.productName}>
                  <strong>{aj.product}</strong>
                  <div style={{ fontSize: '11px', color: 'var(--color-slate)' }}>{aj.sku}</div>
                </td>
                <td className={styles.categoryName}>{aj.type}</td>
                <td>
                  <strong style={{ color: aj.qty > 0 ? '#16a34a' : 'var(--color-alarm-red)' }}>
                    {aj.qty > 0 ? `+${aj.qty}` : aj.qty} u
                  </strong>
                </td>
                <td>{aj.reason}</td>
                <td style={{ color: 'var(--color-slate)', fontSize: '12px' }}>{aj.user}</td>
                <td>
                  <span className={styles.badgeGood}>{aj.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
