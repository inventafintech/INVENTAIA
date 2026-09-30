'use client';

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import styles from './page.module.css';
import { useSearchQuery } from '@/hooks/useSearchQuery';
import LocationSelector from '@/components/inventory/LocationSelector';
import AdvancedFiltersDrawer from '@/components/inventory/AdvancedFiltersDrawer';

import { apiFetch } from '@/lib/apiFetch';
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

type HealthFilter = 'all' | 'healthy' | 'low' | 'critical';

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

  // ── Divulgación progresiva + Ubicación (orquestador) ──
  // Vista principal: solo búsqueda + selector de ubicación + acciones.
  // Categoría y salud viven en el Drawer "Filtros avanzados" (máx. 2 clics).
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [healthFilter, setHealthFilter] = useState<HealthFilter>('all');
  const [showAdvanced, setShowAdvanced] = useState(false);

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
  const [newLocation, setNewLocation] = useState<string>('all');

  // Fetch inventory data — re-evaluación dinámica SPA contra el backend real.
  // Cambiar selectedLocation dispara ?location_id= y recalcula KPIs + tabla
  // sin recargar la página (verdad de base de datos, cero mocks).
  const loadInventory = useCallback(async (locationRef: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (locationRef && locationRef !== 'all') params.set('location_id', locationRef);
      const url = params.toString() ? `/api/dashboard/inventario?${params.toString()}` : '/api/dashboard/inventario';
      const res = await fetch(url, { cache: 'no-store' });
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
  }, []);

  useEffect(() => {
    loadInventory(selectedLocation);
  }, [loadInventory, selectedLocation]);

  const handleLocationChange = (ref: string) => {
    setSelectedLocation(ref);
  };

  // Filtered items (búsqueda + categoría + salud, sobre el subconjunto por ubicación)
  const filtered = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCat =
        selectedCategory === 'all' ||
        item.category.toLowerCase() === selectedCategory.toLowerCase();

      const matchesHealth = healthFilter === 'all' || item.health === healthFilter;

      return matchesSearch && matchesCat && matchesHealth;
    });
  }, [items, searchTerm, selectedCategory, healthFilter]);

  // Dynamic metrics based on current filtered view (or global if unfiltered)
  const displayTotalValue = useMemo(() => {
    return filtered.reduce((sum, item) => sum + item.totalValue, 0);
  }, [filtered]);

  const displayTotalUnits = useMemo(() => {
    return filtered.reduce((sum, item) => sum + item.physicalStock, 0);
  }, [filtered]);

  const advancedCount =
    (selectedCategory !== 'all' ? 1 : 0) + (healthFilter !== 'all' ? 1 : 0);
  const hasActiveFilters =
    searchTerm.trim() !== '' || selectedCategory !== 'all' || healthFilter !== 'all' || selectedLocation !== 'all';

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
    setHealthFilter('all');
    setSelectedLocation('all');
  };

  // Handle Export CSV
  const handleExportCsv = () => {
    const params = new URLSearchParams();
    if (searchTerm) params.set('search', searchTerm);
    if (selectedCategory !== 'all') params.set('category', selectedCategory);
    if (healthFilter !== 'all') params.set('health', healthFilter);
    if (selectedLocation !== 'all') params.set('location_id', selectedLocation);

    window.open(`/api/dashboard/inventario/export?${params.toString()}`, '_blank');
  };

  // Handle Create New SKU
  const handleCreateSku = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/dashboard/inventario', {
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
          // Si hay ubicación seleccionada, el SKU nace dentro de ella.
          ...(selectedLocation !== 'all' || newLocation !== 'all'
            ? { locationRef: (newLocation !== 'all' ? newLocation : selectedLocation).toUpperCase() }
            : {}),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setNewSkuModal(false);
        await loadInventory(selectedLocation);
      } else {
        alert(data.error || 'Error al crear SKU');
      }
    } catch (err: any) {
      alert(`Error de red: ${err.message}`);
    }
  };

  return (
    <div className={styles.container}>
      {/* Header — título a la izquierda, ubicación + acciones a la derecha (top-right) */}
      <header className={styles.header}>
        <div style={{ minWidth: 0, flex: '1 1 220px' }}>
          <h1 className={styles.title}>Maestro de Inventario</h1>
          <p className={styles.subtitle}>
            Valorización de stock en tiempo real, rotación comercial (GMROI) y monitoreo de inventario inmovilizado.
          </p>
          {selectedLocation !== 'all' && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                marginTop: '8px',
                fontSize: '11px',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '999px',
                background: 'var(--color-linen-mist)',
                color: '#1d4ed8',
                border: '1px solid var(--color-forest-ink)',
                maxWidth: '100%',
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                📍 Filtrado por ubicación: {selectedLocation}
              </span>
              <button
                type="button"
                onClick={() => setSelectedLocation('all')}
                aria-label="Quitar filtro de ubicación"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 800, padding: '0 2px' }}
              >
                ✕
              </button>
            </span>
          )}
        </div>
        <div className={styles.headerActions} style={{ minWidth: 0 }}>
          <LocationSelector value={selectedLocation} onChange={handleLocationChange} />
          <button className={styles.btnSecondary} onClick={handleExportCsv}>
            Exportar CSV
          </button>
          <button className={styles.btnPrimary} onClick={() => { setNewLocation(selectedLocation); setNewSkuModal(true); }}>
            + Nuevo SKU
          </button>
        </div>
      </header>

      {/* 4 Tarjetas de Resumen Financiero — se recalculan con la ubicación */}
      <div className={styles.statsGrid} aria-live="polite">
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

      {/* Barra de Herramientas — síntesis visual: solo búsqueda + filtros avanzados */}
      <div className={styles.controls}>
        <div className={styles.searchBox} style={{ minWidth: 0 }}>
          <input
            type="text"
            placeholder="Buscar por nombre o código de SKU..."
            className={styles.input}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Buscar por nombre o SKU"
            style={{ minWidth: 0 }}
          />
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={() => setShowAdvanced(true)}
            aria-expanded={showAdvanced}
            aria-label="Abrir filtros avanzados"
            style={{ position: 'relative', flexShrink: 0 }}
          >
            ⚙ Filtros avanzados
            {advancedCount > 0 && (
              <span
                style={{
                  marginLeft: '6px',
                  fontSize: '11px',
                  fontWeight: 800,
                  background: 'var(--color-forest-ink)',
                  color: '#fff',
                  borderRadius: '999px',
                  padding: '1px 7px',
                }}
              >
                {advancedCount}
              </span>
            )}
          </button>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              style={{ background: 'transparent', border: 'none', color: 'var(--color-forest-ink)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', minHeight: '44px' }}
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Tabla de Datos (Data Grid) — se expande fluidamente al ocultar opciones */}
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
                <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: 'var(--color-slate)' }}>
                  Cargando inventario valorizado en tiempo real...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: 'var(--color-slate)' }}>
                  {selectedLocation !== 'all'
                    ? `Sin stock en la ubicación ${selectedLocation} con los criterios aplicados.`
                    : 'No se encontraron productos coincidentes con los criterios de búsqueda.'}
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

      {/* Drawer de divulgación progresiva: categoría + salud (secundarios) */}
      <AdvancedFiltersDrawer
        open={showAdvanced}
        onClose={() => setShowAdvanced(false)}
        onClear={() => { setSelectedCategory('all'); setHealthFilter('all'); }}
        title="Filtros avanzados"
        activeCount={advancedCount}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
          <label htmlFor="adv-category" style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-charcoal)' }}>
            CATEGORÍA
          </label>
          <select
            id="adv-category"
            className={styles.select}
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{ width: '100%', maxWidth: '100%' }}
          >
            <option value="all">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
          <label htmlFor="adv-health" style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-charcoal)' }}>
            ESTADO DE SALUD
          </label>
          <select
            id="adv-health"
            className={styles.select}
            value={healthFilter}
            onChange={(e) => setHealthFilter(e.target.value as HealthFilter)}
            style={{ width: '100%', maxWidth: '100%' }}
          >
            <option value="all">Todos los estados</option>
            <option value="healthy">Saludable</option>
            <option value="low">Stock Bajo</option>
            <option value="critical">Quiebre Inminente</option>
          </select>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--color-slate)', lineHeight: 1.5, margin: 0 }}>
          La ubicación se selecciona arriba a la derecha y filtra stock, valor y rotación en tiempo real contra la base de datos.
        </p>
      </AdvancedFiltersDrawer>

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

              <div className={styles.formGroup}>
                <label className={styles.label}>Ubicación inicial</label>
                <LocationSelector value={newLocation} onChange={setNewLocation} compact />
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
