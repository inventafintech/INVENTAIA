'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { Store, ShieldCheck, Clock, CheckCircle } from 'lucide-react';
import styles from '@/app/dashboard/inventario/page.module.css';
import { SUPPLIERS_DIRECTORY as SUPPLIERS } from '@/data/businessDirectory';
import { useSearchQuery } from '@/hooks/useSearchQuery';

function ProveedoresContent() {
  const initialQ = useSearchQuery();
  const [searchTerm, setSearchTerm] = useState(initialQ);

  // Sincronizar con ?q= de la búsqueda global (navegación entre resultados)
  useEffect(() => {
    setSearchTerm(initialQ);
  }, [initialQ]);

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
                <td style={{ color: 'var(--color-forest-ink)' }}>{sup.contact}</td>
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

export default function ProveedoresPage() {
  return (
    <Suspense fallback={null}>
      <ProveedoresContent />
    </Suspense>
  );
}
