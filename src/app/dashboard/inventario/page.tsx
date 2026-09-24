'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import styles from './page.module.css';
import { useSearchQuery } from '@/hooks/useSearchQuery';

interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  categoryId: string;
  physicalStock: number;
  safetyStock: number;
  unitCost: number;
  unitPrice: number;
  totalValue: number;
  gmroi: string;
  gmroiValue: number;
  health: 'healthy' | 'low' | 'critical';
  healthLabel: 'Saludable' | 'Stock Bajo' | 'Quiebre Inminente';
}

interface InventoryMetrics {
  totalValue: number;
  totalUnits: number;
  monitoredSkus: number;
  avgGmroi: string;
}

interface Category {
  id: string;
  name: string;
}

export function InventarioContent() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [metrics, setMetrics] = useState<InventoryMetrics>({
    totalValue: 55009.00,
    totalUnits: 2920,
    monitoredSkus: 6,
    avgGmroi: '27.3% GMROI',
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters (q inicial desde la búsqueda global ?q=)
  const initialQ = useSearchQuery();
  const [searchTerm, setSearchTerm] = useState<string>(initialQ);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Sincronizar con ?q= de la búsqueda global (navegación entre resultados)
  useEffect(() => {
    setSearchTerm(initialQ);
  }, [initialQ]);

  // Modal
  const [newSkuModal, setNewSkuModal] = useState<boolean>(false);
  const [newSkuCode, setNewSkuCode] = useState<string>('SKU-GLO-007');
  const [newName, setNewName] = useState<string>('Yogurt Gloria Fresa 1kg');
  const [newCategory, setNewCategory] = useState<string>('Lácteos');
  const [newCost, setNewCost] = useState<number>(5.20);
  const [newPrice, setNewPrice] = useState<number>(6.80);
  const [newStock, setNewStock] = useState<number>(450);
  const [newSafetyStock, setNewSafetyStock] = useState<number>(120);

  // Fetch inventory data
  const loadInventory = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/dashboard/inventario', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.items) setItems(data.items);
        if (data.metrics) setMetrics(data.metrics);
        if (data.categories) setCategories(data.categories);
      }
    } catch (err) {
      console.error('Error fetching inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, []);

  // Filtered items
  const filtered = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCat =
        selectedCategory === 'all' ||
        item.category.toLowerCase() === selectedCategory.toLowerCase();

      return matchesSearch && matchesCat;
    });
  }, [items, searchTerm, selectedCategory]);

  // Dynamic metrics based on current filtered view (or global if unfiltered)
  const displayTotalValue = useMemo(() => {
    return filtered.reduce((sum, item) => sum + item.totalValue, 0);
  }, [filtered]);

  const displayTotalUnits = useMemo(() => {
    return filtered.reduce((sum, item) => sum + item.physicalStock, 0);
  }, [filtered]);

  // Handle Export CSV
  const handleExportCsv = () => {
    const params = new URLSearchParams();
    if (searchTerm) params.set('search', searchTerm);
    if (selectedCategory !== 'all') params.set('category', selectedCategory);

    window.open(`/api/dashboard/inventario/export?${params.toString()}`, '_blank');
  };

  // Handle Create New SKU
  const handleCreateSku = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/dashboard/inventario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skuCode: newSkuCode,
          name: newName,
          categoryName: newCategory,
          unitCost: newCost,
          unitPrice: newPrice,
          physicalStock: newStock,
          safetyStock: newSafetyStock,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setNewSkuModal(false);
        await loadInventory();
      } else {
        alert(data.error || 'Error al crear SKU');
      }
    } catch (err: any) {
      alert(`Error de red: ${err.message}`);
    }
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Maestro de Inventario</h1>
          <p className={styles.subtitle}>
            Valorización de stock en tiempo real, rotación comercial (GMROI) y monitoreo de inventario inmovilizado.
          </p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.btnSecondary} onClick={handleExportCsv}>
            Exportar CSV
          </button>
          <button className={styles.btnPrimary} onClick={() => setNewSkuModal(true)}>
            + Nuevo SKU
          </button>
        </div>
      </header>

      {/* 4 Tarjetas de Resumen Financiero */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>VALOR TOTAL ALMACÉN</span>
          <span className={styles.statValue}>
            S/ {displayTotalValue.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>UNIDADES FÍSICAS</span>
          <span className={styles.statValue}>
            {displayTotalUnits.toLocaleString()} u
          </span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>SKUS MONITOREADOS</span>
          <span className={styles.statValue}>{filtered.length}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>ROTACIÓN PROMEDIO</span>
          <span className={styles.statValue}>{metrics.avgGmroi}</span>
        </div>
      </div>

      {/* Barra de Herramientas */}
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
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="all">Todas las Categorías</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabla de Datos (Data Grid) */}
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
            {loading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                  Cargando inventario valorizado en tiempo real...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                  No se encontraron productos coincidentes con los criterios de búsqueda.
                </td>
              </tr>
            ) : (
              filtered.map((item) => (
                <tr key={item.id}>
                  <td className={styles.skuCode}>{item.sku}</td>
                  <td className={styles.productName}>{item.name}</td>
                  <td className={styles.categoryName}>{item.category}</td>
                  <td className={styles.stockPhysical}>
                    <strong>{item.physicalStock.toLocaleString()} u</strong>
                  </td>
                  <td className={styles.stockSafety}>{item.safetyStock} u</td>
                  <td className={styles.totalValue}>
                    S/ {item.totalValue.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className={styles.gmroiText}>
                    <strong>{item.gmroi}</strong>
                  </td>
                  <td>
                    {item.health === 'healthy' && (
                      <span className={styles.badgeGood}>Saludable</span>
                    )}
                    {item.health === 'low' && (
                      <span className={styles.badgeWarning}>Stock Bajo</span>
                    )}
                    {item.health === 'critical' && (
                      <span className={styles.badgeDanger}>Quiebre Inminente</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Nuevo SKU */}
      {newSkuModal && (
        <div className={styles.modalOverlay} onClick={() => setNewSkuModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Agregar Nuevo SKU al Catálogo</h3>
              <button className={styles.modalClose} onClick={() => setNewSkuModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateSku}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Código SKU</label>
                <input
                  type="text"
                  className={styles.input}
                  value={newSkuCode}
                  onChange={(e) => setNewSkuCode(e.target.value)}
                  placeholder="ej. SKU-ALI-009"
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Nombre del Producto</label>
                <input
                  type="text"
                  className={styles.input}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="ej. Detergente Bolívar 800g"
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Categoría</label>
                <select
                  className={styles.select}
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                >
                  <option value="Abarrotes">Abarrotes</option>
                  <option value="Lácteos">Lácteos</option>
                  <option value="Construcción">Construcción</option>
                  <option value="Bebidas">Bebidas</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Costo Unitario (S/)</label>
                  <input
                    type="number"
                    step="0.01"
                    className={styles.input}
                    value={newCost}
                    onChange={(e) => setNewCost(Number(e.target.value))}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Precio Unitario (S/)</label>
                  <input
                    type="number"
                    step="0.01"
                    className={styles.input}
                    value={newPrice}
                    onChange={(e) => setNewPrice(Number(e.target.value))}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Stock Físico Inicial</label>
                  <input
                    type="number"
                    className={styles.input}
                    value={newStock}
                    onChange={(e) => setNewStock(Number(e.target.value))}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Stock de Seguridad</label>
                  <input
                    type="number"
                    className={styles.input}
                    value={newSafetyStock}
                    onChange={(e) => setNewSafetyStock(Number(e.target.value))}
                    required
                  />
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setNewSkuModal(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className={styles.btnPrimary}>
                  Guardar SKU
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function InventarioPage() {
  return (
    <Suspense fallback={null}>
      <InventarioContent />
    </Suspense>
  );
}
