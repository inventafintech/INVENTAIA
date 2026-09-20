'use client';

import React, { useState } from 'react';
import { Store, ShieldCheck, Clock, CheckCircle } from 'lucide-react';
import styles from '@/app/dashboard/inventario/page.module.css';

const SUPPLIERS = [
  { id: 'SUP-01', name: 'Alicorp S.A.A.', ruc: '20100055237', leadTime: 3, reliability: 98.4, activeOrders: 3, contact: 'ventas.corp@alicorp.com.pe', status: 'Confiable' },
  { id: 'SUP-02', name: 'Costeño Alimentos S.A.C.', ruc: '20256845112', leadTime: 4, reliability: 96.2, activeOrders: 2, contact: 'pedidos@costeno.com.pe', status: 'Confiable' },
  { id: 'SUP-03', name: 'Cartavio S.A.A.', ruc: '20131822831', leadTime: 5, reliability: 94.0, activeOrders: 1, contact: 'comercial@cartavio.com.pe', status: 'Confiable' },
  { id: 'SUP-04', name: 'Leche Gloria S.A.', ruc: '20100190797', leadTime: 2, reliability: 99.1, activeOrders: 4, contact: 'logistica@gloria.com.pe', status: 'Excelente' },
  { id: 'SUP-05', name: 'Kimberly-Clark Perú S.R.L.', ruc: '20297071221', leadTime: 6, reliability: 89.5, activeOrders: 1, contact: 'atencion@kcc.com', status: 'En Observación' },
];

export default function ProveedoresPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = SUPPLIERS.filter(sup =>
    sup.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sup.ruc.includes(searchTerm) ||
    sup.contact.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Directorio de Proveedores</h1>
          <p className={styles.subtitle}>
            Gestión de acuerdos de nivel de servicio (SLA), confiabilidad de entrega y tiempos de reposición (Lead Time).
          </p>
        </div>
      </header>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>PROVEEDORES HOMOLOGADOS</span>
          <span className={styles.statValue}>5 Principales</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>LEAD TIME PROMEDIO</span>
          <span className={styles.statValue}>4.0 Días</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>CONFIABILIDAD GLOBAL</span>
          <span className={styles.statValue} style={{ color: '#16a34a' }}>95.4%</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>ÓRDENES EN CURSO</span>
          <span className={styles.statValue}>11 OCs</span>
        </div>
      </div>

      <div className={styles.controls}>
        <div className={styles.searchBox}>
          <input
            type="text"
            placeholder="Buscar por proveedor, RUC o email de contacto..."
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
              <th>RUC</th>
              <th>PROVEEDOR</th>
              <th>LEAD TIME (REPOSICIÓN)</th>
              <th>CONFIABILIDAD SLA</th>
              <th>ÓRDENES ACTIVAS</th>
              <th>CONTACTO</th>
              <th>CALIFICACIÓN</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((sup) => (
              <tr key={sup.id}>
                <td className={styles.skuCode}>{sup.ruc}</td>
                <td className={styles.productName}><strong>{sup.name}</strong></td>
                <td>
                  <strong>{sup.leadTime} días</strong>
                </td>
                <td>
                  <strong style={{ color: sup.reliability >= 95 ? '#16a34a' : '#d97706' }}>
                    {sup.reliability}%
                  </strong>
                </td>
                <td>{sup.activeOrders} órdenes</td>
                <td style={{ color: '#3b82f6' }}>{sup.contact}</td>
                <td>
                  {sup.status === 'Excelente' ? (
                    <span className={styles.badgeGood}>Excelente</span>
                  ) : sup.status === 'Confiable' ? (
                    <span className={styles.badgeGood}>Confiable</span>
                  ) : (
                    <span className={styles.badgeWarning}>Observación</span>
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
