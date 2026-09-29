'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { Users, Building, CreditCard, ShoppingCart } from 'lucide-react';
import styles from '@/app/dashboard/inventario/page.module.css';
import { CLIENTS } from '@/data/businessDirectory';
import { useSearchQuery } from '@/hooks/useSearchQuery';

function ClientesContent() {
  const initialQ = useSearchQuery();
  const [searchTerm, setSearchTerm] = useState(initialQ);

  // Sincronizar con ?q= de la búsqueda global (navegación entre resultados)
  useEffect(() => {
    setSearchTerm(initialQ);
  }, [initialQ]);

  const filtered = CLIENTS.filter(cli =>
    cli.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cli.ruc.includes(searchTerm) ||
    cli.canal.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Clientes y Cuentas Comerciales</h1>
          <p className={styles.subtitle}>
            Monitoreo de cartera B2B, pedidos recurrentes y asignación de líneas de crédito comercial.
          </p>
        </div>
      </header>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>CLIENTES ACTIVOS</span>
          <span className={styles.statValue}>5 Cuentas Clave</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>PEDIDOS EN CURSO</span>
          <span className={styles.statValue}>53 Envíos</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>CRÉDITO TOTAL ASIGNADO</span>
          <span className={styles.statValue}>S/ 645,000</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>TASA DE COBRANZA</span>
          <span className={styles.statValue} style={{ color: '#16a34a' }}>98.9%</span>
        </div>
      </div>

      <div className={styles.controls}>
        <div className={styles.searchBox}>
          <input
            type="text"
            placeholder="Buscar por cliente, RUC o canal comercial..."
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
              <th>CLIENTE / CUENTA COMERCIAL</th>
              <th>CANAL</th>
              <th>PEDIDOS ACTIVOS</th>
              <th>LÍNEA DE CRÉDITO</th>
              <th>CONDICIÓN PAGO</th>
              <th>ESTADO</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((cli) => (
              <tr key={cli.id}>
                <td className={styles.skuCode}>{cli.ruc}</td>
                <td className={styles.productName}><strong>{cli.name}</strong></td>
                <td className={styles.categoryName}>{cli.canal}</td>
                <td><strong>{cli.activeOrders} pedidos</strong></td>
                <td style={{ color: 'var(--color-obsidian)', fontWeight: 600 }}>{cli.creditLine}</td>
                <td>{cli.paymentTerms}</td>
                <td>
                  <span className={styles.badgeGood}>{cli.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ClientesPage() {
  return (
    <Suspense fallback={null}>
      <ClientesContent />
    </Suspense>
  );
}
