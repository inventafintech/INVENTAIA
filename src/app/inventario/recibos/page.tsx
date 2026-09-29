'use client';

import React, { useState } from 'react';
import { ArrowDownLeft, FileText, CheckCircle2, PackageCheck } from 'lucide-react';
import styles from '@/app/dashboard/inventario/page.module.css';

const RECEIPTS = [
  { id: 'REC-2026-088', poCode: 'OC-2026-004', supplier: 'Alicorp S.A.A.', date: '2026-09-19', itemsCount: 450, totalVal: 'S/ 24,750', inspector: 'Marcos Vílchez', status: 'Conforme' },
  { id: 'REC-2026-087', poCode: 'OC-2026-003', supplier: 'Costeño Alimentos S.A.C.', date: '2026-09-18', itemsCount: 600, totalVal: 'S/ 19,200', inspector: 'Marcos Vílchez', status: 'Conforme' },
  { id: 'REC-2026-086', poCode: 'OC-2026-002', supplier: 'Cartavio S.A.A.', date: '2026-09-16', itemsCount: 300, totalVal: 'S/ 9,600', inspector: 'Carlos Mendoza', status: 'Conforme' },
  { id: 'REC-2026-085', poCode: 'OC-2026-001', supplier: 'Leche Gloria S.A.', date: '2026-09-14', itemsCount: 1200, totalVal: 'S/ 38,400', inspector: 'Marcos Vílchez', status: 'Conforme' },
];

export default function RecibosPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = RECEIPTS.filter(rec =>
    rec.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rec.poCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rec.supplier.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Recibos de Mercadería</h1>
          <p className={styles.subtitle}>
            Control de ingresos a almacén, notas de entrada de proveedores y verificación de bultos vs órdenes de compra.
          </p>
        </div>
      </header>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>RECIBOS COMPLETADOS</span>
          <span className={styles.statValue}>4 Este Mes</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>UNIDADES INGRESADAS</span>
          <span className={styles.statValue}>2,550 u</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>VALOR RECIBIDO</span>
          <span className={styles.statValue}>S/ 91,950</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>TASA DE CONFORMIDAD</span>
          <span className={styles.statValue} style={{ color: '#16a34a' }}>100%</span>
        </div>
      </div>

      <div className={styles.controls}>
        <div className={styles.searchBox}>
          <input
            type="text"
            placeholder="Buscar por N° recibo, OC o proveedor..."
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
              <th>N° RECIBO</th>
              <th>OC ASOCIADA</th>
              <th>PROVEEDOR</th>
              <th>FECHA RECEPCIÓN</th>
              <th>UNIDADES RECIBIDAS</th>
              <th>VALOR TOTAL</th>
              <th>RESPONSABLE INSPECCIÓN</th>
              <th>ESTADO</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((rec) => (
              <tr key={rec.id}>
                <td className={styles.skuCode}>{rec.id}</td>
                <td><strong style={{ color: 'var(--color-forest-ink)' }}>{rec.poCode}</strong></td>
                <td className={styles.productName}><strong>{rec.supplier}</strong></td>
                <td>{rec.date}</td>
                <td>{rec.itemsCount.toLocaleString()} u</td>
                <td><strong style={{ color: 'var(--color-obsidian)' }}>{rec.totalVal}</strong></td>
                <td style={{ color: 'var(--color-slate)' }}>{rec.inspector}</td>
                <td>
                  <span className={styles.badgeGood}>{rec.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
