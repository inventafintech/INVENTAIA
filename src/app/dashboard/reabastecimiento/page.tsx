'use client';

import { useState } from 'react';
import styles from './page.module.css';

interface ReplenishmentItem {
  id: string;
  sku: string;
  name: string;
  provider: string;
  currentStock: number;
  rop: number;
  daysRemaining: number;
  suggestedQty: number;
  unitCost: number;
  status: 'critical' | 'warning' | 'optimal';
}

const initialItems: ReplenishmentItem[] = [
  {
    id: '1',
    sku: 'SKU-ALI-001',
    name: 'Aceite Primor Premium 1L',
    provider: 'Alicorp S.A.',
    currentStock: 180,
    rop: 432,
    daysRemaining: 1.9,
    suggestedQty: 2500,
    unitCost: 8.50,
    status: 'critical',
  },
  {
    id: '2',
    sku: 'SKU-GLO-002',
    name: 'Leche Evaporada Gloria Azul 400g',
    provider: 'Leche Gloria S.A.',
    currentStock: 340,
    rop: 650,
    daysRemaining: 3.2,
    suggestedQty: 1800,
    unitCost: 3.80,
    status: 'critical',
  },
  {
    id: '3',
    sku: 'SKU-COS-003',
    name: 'Arroz Costeño Extra 5kg',
    provider: 'Costeño Alimentos',
    currentStock: 520,
    rop: 780,
    daysRemaining: 5.4,
    suggestedQty: 1200,
    unitCost: 21.00,
    status: 'warning',
  },
  {
    id: '4',
    sku: 'SKU-SOL-004',
    name: 'Cemento Sol Tipo I 42.5kg',
    provider: 'UNACEM',
    currentStock: 850,
    rop: 900,
    daysRemaining: 8.1,
    suggestedQty: 3000,
    unitCost: 29.50,
    status: 'optimal',
  },
  {
    id: '5',
    sku: 'SKU-DON-005',
    name: 'Fideos Don Vittorio Spaghetti 500g',
    provider: 'Alicorp S.A.',
    currentStock: 410,
    rop: 550,
    daysRemaining: 4.0,
    suggestedQty: 1500,
    unitCost: 3.20,
    status: 'warning',
  },
];

export default function ReabastecimientoPage() {
  const [items, setItems] = useState<ReplenishmentItem[]>(initialItems);
  const [filter, setFilter] = useState('all');
  const [approvedId, setApprovedId] = useState<string | null>(null);

  const filteredItems = items.filter(item => {
    if (filter === 'all') return true;
    return item.status === filter;
  });

  const totalCapitalRequired = filteredItems.reduce(
    (acc, curr) => acc + curr.suggestedQty * curr.unitCost, 
    0
  );

  const handleApprove = (id: string) => {
    setApprovedId(id);
    setTimeout(() => {
      setApprovedId(null);
      alert('Orden de compra generada exitosamente en estado Borrador para revisión de Finanzas.');
    }, 500);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Reabastecimiento Inteligente</h1>
          <p className={styles.subtitle}>
            Sugerencias de compra calculadas con el Punto de Reorden (ROP) y velocidad de venta en tiempo real.
          </p>
        </div>
        <div className={styles.headerStats}>
          <div className={styles.statCard}>
            <span className={styles.statValue}>S/ {totalCapitalRequired.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
            <span className={styles.statLabel}>Capital Requerido Sugerido</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{items.filter(i => i.status === 'critical').length} SKUs</span>
            <span className={styles.statLabel}>En Quiebre Inminente (&lt;3d)</span>
          </div>
        </div>
      </header>

      <div className={styles.actionsBar}>
        <div className={styles.searchFilter}>
          <input 
            type="text" 
            placeholder="Buscar por SKU, producto o proveedor..." 
            className={styles.input}
          />
          <select 
            className={styles.select} 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">Todos los Estados</option>
            <option value="critical">Críticos (&lt; 3 días)</option>
            <option value="warning">Alerta (3 - 7 días)</option>
            <option value="optimal">Normal (&gt; 7 días)</option>
          </select>
        </div>
        <button 
          className={styles.btnPrimary}
          onClick={() => alert('Generando 5 órdenes agrupadas por proveedor para Alicorp, Gloria y UNACEM...')}
        >
          Aprobar Todo (1-Clic)
        </button>
      </div>

      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>SKU / PRODUCTO</th>
              <th>PROVEEDOR</th>
              <th>STOCK ACTUAL</th>
              <th>PUNTO REORDEN (ROP)</th>
              <th>COBERTURA</th>
              <th>COMPRA SUGERIDA</th>
              <th>INVERSIÓN</th>
              <th>ESTADO</th>
              <th>ACCIÓN</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item) => (
              <tr key={item.id}>
                <td>
                  <div className={styles.skuInfo}>
                    <span className={styles.skuName}>{item.name}</span>
                    <span className={styles.skuCode}>{item.sku}</span>
                  </div>
                </td>
                <td>{item.provider}</td>
                <td><strong>{item.currentStock.toLocaleString()} u</strong></td>
                <td>{item.rop.toLocaleString()} u</td>
                <td>
                  <strong style={{ color: item.daysRemaining < 3 ? '#dc2626' : 'inherit' }}>
                    {item.daysRemaining} días
                  </strong>
                </td>
                <td>
                  <strong>{item.suggestedQty.toLocaleString()} u</strong>
                </td>
                <td>
                  S/ {(item.suggestedQty * item.unitCost).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                </td>
                <td>
                  {item.status === 'critical' && <span className={styles.badgeCritical}>Crítico</span>}
                  {item.status === 'warning' && <span className={styles.badgeWarning}>Alerta</span>}
                  {item.status === 'optimal' && <span className={styles.badgeOptimal}>Normal</span>}
                </td>
                <td>
                  <button 
                    className={styles.btnTableAction}
                    onClick={() => handleApprove(item.id)}
                    disabled={approvedId === item.id}
                  >
                    {approvedId === item.id ? 'Generando...' : 'Generar OC'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
