'use client';

import { useState } from 'react';
import styles from './page.module.css';

interface Order {
  id: string;
  orderNumber: string;
  provider: string;
  itemsCount: number;
  total: number;
  paymentTerms: string;
  expectedDate: string;
  status: 'draft' | 'approved' | 'transit' | 'received';
}

const initialOrders: Order[] = [
  {
    id: '1',
    orderNumber: 'OC-2026-089',
    provider: 'Alicorp S.A.',
    itemsCount: 4,
    total: 38450.00,
    paymentTerms: 'Crédito 30d',
    expectedDate: '24 Sep 2026',
    status: 'draft',
  },
  {
    id: '2',
    orderNumber: 'OC-2026-088',
    provider: 'Leche Gloria S.A.',
    itemsCount: 2,
    total: 19800.00,
    paymentTerms: 'Factoring Pichincha',
    expectedDate: '22 Sep 2026',
    status: 'draft',
  },
  {
    id: '3',
    orderNumber: 'OC-2026-087',
    provider: 'UNACEM S.A.A.',
    itemsCount: 1,
    total: 88500.00,
    paymentTerms: 'Contado Anticipado',
    expectedDate: '21 Sep 2026',
    status: 'approved',
  },
  {
    id: '4',
    orderNumber: 'OC-2026-086',
    provider: 'Costeño Alimentos S.A.C.',
    itemsCount: 3,
    total: 25200.00,
    paymentTerms: 'Crédito 45d',
    expectedDate: '20 Sep 2026',
    status: 'transit',
  },
  {
    id: '5',
    orderNumber: 'OC-2026-085',
    provider: 'Backus & Johnston',
    itemsCount: 6,
    total: 54100.00,
    paymentTerms: 'Crédito 15d',
    expectedDate: '18 Sep 2026',
    status: 'received',
  },
];

export default function OrdenesPage() {
  const [orders, setOrders] = useState<Order[]>(initialOrders);

  const handleApprove = (id: string) => {
    setOrders(orders.map(o => o.id === id ? { ...o, status: 'approved' } : o));
    alert('Orden aprobada y enviada automáticamente vía EDI a Alicorp.');
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Órdenes de Compra (OC)</h1>
          <p className={styles.subtitle}>
            Control ejecutivo de compras, trazabilidad de entregas y conciliación con proveedores.
          </p>
        </div>
        <button 
          className={styles.btnPrimary}
          onClick={() => alert('Crear nueva orden manual')}
        >
          + Nueva Orden
        </button>
      </header>

      <div className={styles.summaryCards}>
        <div className={styles.card}>
          <span className={styles.cardTitle}>Por Aprobar</span>
          <span className={styles.cardValue}>
            {orders.filter(o => o.status === 'draft').length}
          </span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardTitle}>En Tránsito</span>
          <span className={styles.cardValue}>
            {orders.filter(o => o.status === 'transit').length}
          </span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardTitle}>Comprometido (Mes)</span>
          <span className={styles.cardValue}>
            S/ {orders.reduce((a, c) => a + c.total, 0).toLocaleString('es-PE', { minimumFractionDigits: 0 })}
          </span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardTitle}>Cumplimiento Lead Time</span>
          <span className={styles.cardValue}>96.8%</span>
        </div>
      </div>

      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Nº ORDEN</th>
              <th>PROVEEDOR</th>
              <th>LÍNEAS</th>
              <th>CONDICIÓN</th>
              <th>TOTAL</th>
              <th>LLEGADA ESTIMADA</th>
              <th>ESTADO</th>
              <th>ACCIÓN</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td><strong>{order.orderNumber}</strong></td>
                <td>{order.provider}</td>
                <td>{order.itemsCount} SKUs</td>
                <td>{order.paymentTerms}</td>
                <td><strong>S/ {order.total.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</strong></td>
                <td>{order.expectedDate}</td>
                <td>
                  {order.status === 'draft' && <span className={styles.badgeDraft}>Borrador</span>}
                  {order.status === 'approved' && <span className={styles.badgeApproved}>Aprobada</span>}
                  {order.status === 'transit' && <span className={styles.badgeTransit}>En Tránsito</span>}
                  {order.status === 'received' && <span className={styles.badgeReceived}>Recibida</span>}
                </td>
                <td>
                  {order.status === 'draft' ? (
                    <button 
                      className={styles.btnAction}
                      onClick={() => handleApprove(order.id)}
                    >
                      Aprobar
                    </button>
                  ) : (
                    <button 
                      className={styles.btnAction}
                      onClick={() => alert(`Descargando PDF de ${order.orderNumber}`)}
                    >
                      PDF
                    </button>
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
