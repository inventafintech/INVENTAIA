'use client';

import { useState } from 'react';
import styles from './page.module.css';

interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  stock: number;
  safetyStock: number;
  unitValue: number;
  gmroi: string;
  health: 'healthy' | 'low' | 'critical';
}

const initialInventory: InventoryItem[] = [
  {
    id: '1',
    sku: 'SKU-ALI-001',
    name: 'Aceite Primor Premium 1L',
    category: 'Abarrotes',
    stock: 180,
    safetyStock: 56,
    unitValue: 8.50,
    gmroi: '32%',
    health: 'critical',
  },
  {
    id: '2',
    sku: 'SKU-GLO-002',
    name: 'Leche Evaporada Gloria Azul 400g',
    category: 'Lácteos',
    stock: 340,
    safetyStock: 120,
    unitValue: 3.80,
    gmroi: '25%',
    health: 'low',
  },
  {
    id: '3',
    sku: 'SKU-COS-003',
    name: 'Arroz Costeño Extra 5kg',
    category: 'Abarrotes',
    stock: 520,
    safetyStock: 200,
    unitValue: 21.00,
    gmroi: '28%',
    health: 'healthy',
  },
  {
    id: '4',
    sku: 'SKU-SOL-004',
    name: 'Cemento Sol Tipo I 42.5kg',
    category: 'Construcción',
    stock: 850,
    safetyStock: 300,
    unitValue: 29.50,
    gmroi: '19%',
    health: 'healthy',
  },
  {
    id: '5',
    sku: 'SKU-DON-005',
    name: 'Fideos Don Vittorio Spaghetti 500g',
    category: 'Abarrotes',
    stock: 410,
    safetyStock: 150,
    unitValue: 3.20,
    gmroi: '22%',
    health: 'low',
  },
  {
    id: '6',
    sku: 'SKU-BAC-006',
    name: 'Cerveza Pilsen Callao 330ml Sixpack',
    category: 'Bebidas',
    stock: 620,
    safetyStock: 180,
    unitValue: 24.00,
    gmroi: '38%',
    health: 'healthy',
  },
];

export default function InventarioPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('all');

  const filtered = initialInventory.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = category === 'all' || item.category === category;
    return matchesSearch && matchesCat;
  });

  const totalValue = initialInventory.reduce((a, c) => a + c.stock * c.unitValue, 0);
  const totalUnits = initialInventory.reduce((a, c) => a + c.stock, 0);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Maestro de Inventario</h1>
          <p className={styles.subtitle}>
            Valorización de stock en tiempo real, rotación comercial (GMROI) y monitoreo de inventario inmovilizado.
          </p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.btnSecondary} onClick={() => alert('Exportando reporte a Excel...')}>
            Exportar CSV
          </button>
          <button className={styles.btnPrimary} onClick={() => alert('Añadir nuevo producto al catálogo')}>
            + Nuevo SKU
          </button>
        </div>
      </header>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Valor Total Almacén</span>
          <span className={styles.statValue}>S/ {totalValue.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Unidades Físicas</span>
          <span className={styles.statValue}>{totalUnits.toLocaleString()} u</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>SKUs Monitoreados</span>
          <span className={styles.statValue}>{initialInventory.length}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Rotación Promedio</span>
          <span className={styles.statValue}>27.3% GMROI</span>
        </div>
      </div>

      <div className={styles.controls}>
        <div className={styles.searchBox}>
          <input 
            type="text" 
            placeholder="Buscar por nombre o código de SKU..."
            className={styles.input}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select 
            className={styles.select}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="all">Todas las Categorías</option>
            <option value="Abarrotes">Abarrotes</option>
            <option value="Lácteos">Lácteos</option>
            <option value="Construcción">Construcción</option>
            <option value="Bebidas">Bebidas</option>
          </select>
        </div>
      </div>

      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>SKU / CÓDIGO</th>
              <th>PRODUCTO</th>
              <th>CATEGORÍA</th>
              <th>STOCK FÍSICO</th>
              <th>STOCK SEGURIDAD</th>
              <th>VALOR TOTAL</th>
              <th>GMROI</th>
              <th>SALUD</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id}>
                <td><strong>{item.sku}</strong></td>
                <td>{item.name}</td>
                <td>{item.category}</td>
                <td><strong>{item.stock.toLocaleString()} u</strong></td>
                <td>{item.safetyStock} u</td>
                <td>S/ {(item.stock * item.unitValue).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</td>
                <td><strong>{item.gmroi}</strong></td>
                <td>
                  {item.health === 'healthy' && <span className={styles.badgeGood}>Saludable</span>}
                  {item.health === 'low' && <span className={styles.badgeWarning}>Stock Bajo</span>}
                  {item.health === 'critical' && <span className={styles.badgeDanger}>Quiebre Inminente</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
