'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { MapPin, Warehouse, Layers, CheckCircle2 } from 'lucide-react';
import styles from '@/app/dashboard/inventario/page.module.css';
import { LOCATIONS } from '@/data/businessDirectory';
import { useSearchQuery } from '@/hooks/useSearchQuery';

function UbicacionesContent() {
  const initialQ = useSearchQuery();
  const [searchTerm, setSearchTerm] = useState(initialQ);

  // Sincronizar con ?q= de la búsqueda global (navegación entre resultados)
  useEffect(() => {
    setSearchTerm(initialQ);
  }, [initialQ]);

  const filtered = LOCATIONS.filter(loc =>
    loc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    loc.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    loc.zone.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Ubicaciones y Almacenes</h1>
          <p className={styles.subtitle}>
            Control de centros de distribución, almacenes satélite y zonas físicas de acopio.
          </p>
        </div>
      </header>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>ALMACENES ACTIVOS</span>
          <span className={styles.statValue}>4 Centros</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>CAPACIDAD TOTAL</span>
          <span className={styles.statValue}>5,400 m³</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>OCUPACIÓN PROMEDIO</span>
          <span className={styles.statValue}>63.2%</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>TOTAL SKUS ALMACENADOS</span>
          <span className={styles.statValue}>1,565</span>
        </div>
      </div>

      <div className={styles.controls}>
        <div className={styles.searchBox}>
          <input
            type="text"
            placeholder="Buscar por almacén, código o zona..."
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
              <th>CÓDIGO</th>
              <th>NOMBRE DEL ALMACÉN</th>
              <th>ZONA GEOGRÁFICA</th>
              <th>CAPACIDAD</th>
              <th>OCUPACIÓN</th>
              <th>SKUS</th>
              <th>ESTADO</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((loc) => (
              <tr key={loc.id}>
                <td className={styles.skuCode}>{loc.code}</td>
                <td className={styles.productName}><strong>{loc.name}</strong></td>
                <td className={styles.categoryName}>{loc.zone}</td>
                <td>{loc.capacity}</td>
                <td>
                  <strong>{loc.occupation}</strong>
                </td>
                <td>{loc.skus} SKUs</td>
                <td>
                  {loc.status === 'Operativo' ? (
                    <span className={styles.badgeGood}>{loc.status}</span>
                  ) : (
                    <span className={styles.badgeWarning}>{loc.status}</span>
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

export default function UbicacionesPage() {
  return (
    <Suspense fallback={null}>
      <UbicacionesContent />
    </Suspense>
  );
}
