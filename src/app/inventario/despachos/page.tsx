'use client';

import { useState } from 'react';
import styles from '@/app/dashboard/inventario/page.module.css';

const DISPATCHES = [
  { id: 'DES-2026-114', guideNumber: 'GR-001-00984', client: 'Supermercados Peruanos S.A.', destination: 'CD San Juan de Lurigancho', date: '2026-09-19', units: 350, carrier: 'Transportes TransLima S.A.C.', status: 'Entregado' },
  { id: 'DES-2026-113', guideNumber: 'GR-001-00983', client: 'Cencosud Retail Perú S.A.', destination: 'Plaza Lima Norte', date: '2026-09-19', units: 280, carrier: 'Transportes TransLima S.A.C.', status: 'En Ruta' },
  { id: 'DES-2026-112', guideNumber: 'GR-001-00982', client: 'Tiendas Mass / InRetail', destination: 'Almacén Central Villa El Salvador', date: '2026-09-18', units: 620, carrier: 'Flota Propia Inventa', status: 'Entregado' },
  { id: 'DES-2026-111', guideNumber: 'GR-001-00981', client: 'Distribuidora Mayorista El Sol', destination: 'Sede Central La Victoria', date: '2026-09-17', units: 150, carrier: 'Flota Propia Inventa', status: 'Entregado' },
];

export default function DespachosPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = DISPATCHES.filter(des =>
    des.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    des.guideNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    des.client.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Despachos y Salidas de Almacén</h1>
          <p className={styles.subtitle}>
            Control de guías de remisión, salidas de mercadería hacia clientes B2B y estado de tránsito en tiempo real.
          </p>
        </div>
      </header>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>DESPACHOS DEL DÍA</span>
          <span className={styles.statValue}>2 Envíos</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>UNIDADES DESPACHADAS</span>
          <span className={styles.statValue}>1,400 u</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>EN RUTA ACTUALMENTE</span>
          <span className={styles.statValue} style={{ color: 'var(--color-forest-ink)' }}>1 Despacho</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>CUMPLIMIENTO ON-TIME</span>
          <span className={styles.statValue} style={{ color: '#16a34a' }}>97.8%</span>
        </div>
      </div>

      <div className={styles.controls}>
        <div className={styles.searchBox}>
          <input
            type="text"
            placeholder="Buscar por N° despacho, guía de remisión o cliente..."
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
              <th>ID DESPACHO</th>
              <th>GUÍA REMISIÓN</th>
              <th>CLIENTE / DESTINO</th>
              <th>FECHA SALIDA</th>
              <th>UNIDADES</th>
              <th>TRANSPORTISTA</th>
              <th>ESTADO DE ENTREGA</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((des) => (
              <tr key={des.id}>
                <td className={styles.skuCode}>{des.id}</td>
                <td><strong style={{ color: 'var(--color-forest-ink)' }}>{des.guideNumber}</strong></td>
                <td className={styles.productName}>
                  <strong>{des.client}</strong>
                  <div style={{ fontSize: '11px', color: 'var(--color-slate)' }}>{des.destination}</div>
                </td>
                <td>{des.date}</td>
                <td><strong>{des.units} u</strong></td>
                <td style={{ color: 'var(--color-slate)' }}>{des.carrier}</td>
                <td>
                  {des.status === 'Entregado' ? (
                    <span className={styles.badgeGood}>Entregado</span>
                  ) : (
                    <span className={styles.badgeWarning}>En Ruta</span>
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
