'use client';

import { useState } from 'react';
import styles from '@/app/dashboard/inventario/page.module.css';

const CATEGORIES = [
  { id: 'CAT-01', code: 'ABA', name: 'Abarrotes & Alimentos', skus: 340, targetMargin: '24.5%', revenueShare: '42%', reorderStrategy: 'JIT Demanda Alta', status: 'Activa' },
  { id: 'CAT-02', code: 'LAC', name: 'Lácteos & Derivados', skus: 180, targetMargin: '28.0%', revenueShare: '26%', reorderStrategy: 'FEFO / Corta Vida', status: 'Activa' },
  { id: 'CAT-03', code: 'BEB', name: 'Bebidas & Licores', skus: 125, targetMargin: '32.0%', revenueShare: '18%', reorderStrategy: 'Estacional / Quincenal', status: 'Activa' },
  { id: 'CAT-04', code: 'CON', name: 'Construcción & Ferretería', skus: 95, targetMargin: '35.5%', revenueShare: '14%', reorderStrategy: 'Lote Económico (EOQ)', status: 'Activa' },
];

export default function CategoriasPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = CATEGORIES.filter(cat =>
    cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cat.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Categorías y Familias de Productos</h1>
          <p className={styles.subtitle}>
            Organización del catálogo comercial, márgenes brutos meta y políticas de reposición por familia.
          </p>
        </div>
      </header>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>CATEGORÍAS ACTIVAS</span>
          <span className={styles.statValue}>4 Familias</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>SKUS TOTALES CLASIFICADOS</span>
          <span className={styles.statValue}>740 SKUs</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>MARGEN BRUTO PROMEDIO</span>
          <span className={styles.statValue} style={{ color: '#16a34a' }}>30.0%</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>COBERTURA DEL CATÁLOGO</span>
          <span className={styles.statValue} style={{ color: '#16a34a' }}>100%</span>
        </div>
      </div>

      <div className={styles.controls}>
        <div className={styles.searchBox}>
          <input
            type="text"
            placeholder="Buscar por categoría o código..."
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
              <th>FAMILIA / CATEGORÍA</th>
              <th>SKUS VINCULADOS</th>
              <th>MARGEN TARGET</th>
              <th>PARTICIPACIÓN VENTAS</th>
              <th>ESTRATEGIA DE COMPRA</th>
              <th>ESTADO</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((cat) => (
              <tr key={cat.id}>
                <td className={styles.skuCode}>{cat.code}</td>
                <td className={styles.productName}><strong>{cat.name}</strong></td>
                <td>{cat.skus} SKUs</td>
                <td><strong style={{ color: '#16a34a' }}>{cat.targetMargin}</strong></td>
                <td>{cat.revenueShare}</td>
                <td style={{ color: 'var(--color-slate)' }}>{cat.reorderStrategy}</td>
                <td>
                  <span className={styles.badgeGood}>{cat.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
