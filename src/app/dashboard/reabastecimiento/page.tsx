'use client';

import { useState, useEffect, useMemo } from 'react';
import styles from './page.module.css';
import { BatchApprovalModal } from '@/components/forms/BatchApprovalModal';
import { BatchItemExecutionResult } from '@/services/BatchOrderApprovalService';
import { triggerNotificationRefresh } from '@/context/NotificationContext';

interface RestockItem {
  id: string;
  sku: string;
  name: string;
  provider: string;
  providerType: 'corporate' | 'traditional';
  providerPhone?: string;
  currentStock: number;
  dailyVelocity: number;
  leadTimeDays: number;
  safetyStock: number;
  rop: number;
  coverageDays: number;
  suggestedQty: number;
  unitCost: number;
  investment: number;
  status: 'critical' | 'warning' | 'optimal';
}

export default function ReabastecimientoPage() {
  const [items, setItems] = useState<RestockItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Execution states
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [approvingAll, setApprovingAll] = useState<boolean>(false);
  const [resultsModal, setResultsModal] = useState<{
    open: boolean;
    count: number;
    summary: string;
    results: BatchItemExecutionResult[];
  } | null>(null);

  // Fetch real data from backend
  const fetchRestockData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/dashboard/reabastecimiento', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.items) {
          setItems(data.items);
        }
      }
    } catch (err) {
      console.error('Error fetching restock items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRestockData();
  }, []);

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.provider.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' || item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [items, searchQuery, statusFilter]);

  // Dynamic KPIs
  const totalCapitalRequired = useMemo(() => {
    return filteredItems.reduce((acc, curr) => acc + curr.investment, 0);
  }, [filteredItems]);

  const criticalCount = useMemo(() => {
    return filteredItems.filter((i) => i.status === 'critical').length;
  }, [filteredItems]);

  // Handle single PO generation
  const handleGenerateOC = async (item: RestockItem) => {
    try {
      setProcessingId(item.id);
      const res = await fetch('/api/dashboard/reabastecimiento/oc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: item.id }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setResultsModal({
          open: true,
          count: data.count,
          summary: data.summary,
          results: data.results,
        });
        triggerNotificationRefresh();
      } else {
        alert(data.error || 'Error al procesar la orden de compra.');
      }
    } catch (err: any) {
      alert(`Error de conexión: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  // Handle Approve All (1-Click)
  const handleApproveAll = async () => {
    if (filteredItems.length === 0) return;
    try {
      setApprovingAll(true);
      const res = await fetch('/api/dashboard/reabastecimiento/oc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approveAll: true }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setResultsModal({
          open: true,
          count: data.count,
          summary: data.summary,
          results: data.results,
        });
        triggerNotificationRefresh();
      } else {
        alert(data.error || 'Error al procesar las órdenes masivas.');
      }
    } catch (err: any) {
      alert(`Error de conexión: ${err.message}`);
    } finally {
      setApprovingAll(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Header y KPIs */}
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Reabastecimiento Inteligente</h1>
          <p className={styles.subtitle}>
            Sugerencias de compra calculadas con el Punto de Reorden (ROP) y velocidad de venta en tiempo real.
          </p>
        </div>
        <div className={styles.headerStats}>
          <div className={styles.statCard}>
            <span className={styles.statValue}>
              S/ {totalCapitalRequired.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className={styles.statLabel}>Capital Requerido Sugerido</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{criticalCount} SKUs</span>
            <span className={styles.statLabel}>En Quiebre Inminente (&lt;3d)</span>
          </div>
        </div>
      </header>

      {/* Barra de Herramientas */}
      <div className={styles.actionsBar}>
        <div className={styles.searchFilter}>
          <div className={styles.searchWrapper}>
            <input
              type="text"
              placeholder="Buscar por SKU, producto o proveedor..."
              className={styles.input}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            className={styles.select}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Todos los Estados</option>
            <option value="critical">Crítico (&lt; 3 días)</option>
            <option value="warning">Alerta (3 - 7 días)</option>
            <option value="optimal">Normal (&gt; 7 días)</option>
          </select>
        </div>
        <button
          className={styles.btnPrimary}
          onClick={handleApproveAll}
          disabled={approvingAll || filteredItems.length === 0}
        >
          {approvingAll ? 'Transmitiendo Órdenes...' : 'Aprobar Todo (1-Clic)'}
        </button>
      </div>

      {/* Tabla de Datos (Data Grid) */}
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
            {loading ? (
              <tr>
                <td colSpan={9} className={styles.emptyState}>
                  Calculando algoritmo de Punto de Reorden (ROP) y cobertura...
                </td>
              </tr>
            ) : filteredItems.length === 0 ? (
              <tr>
                <td colSpan={9} className={styles.emptyState}>
                  No se encontraron productos coincidentes con los criterios de búsqueda.
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className={styles.skuInfo}>
                      <span className={styles.skuName}>{item.name}</span>
                      <span className={styles.skuCode}>{item.sku}</span>
                    </div>
                  </td>
                  <td className={styles.providerText}>{item.provider}</td>
                  <td>
                    <span className={styles.stockNumber}>
                      {item.currentStock.toLocaleString()} u
                    </span>
                  </td>
                  <td className={styles.ropNumber}>
                    {item.rop.toLocaleString()} u
                  </td>
                  <td>
                    <span
                      className={
                        item.coverageDays < 3.0
                          ? styles.coverageCritical
                          : styles.coverageNormal
                      }
                    >
                      {item.coverageDays.toFixed(1).replace('.0', '')} días
                    </span>
                  </td>
                  <td>
                    <span className={styles.suggestedQty}>
                      {item.suggestedQty.toLocaleString()} u
                    </span>
                  </td>
                  <td>
                    <span className={styles.investmentAmount}>
                      S/ {item.investment.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td>
                    {item.status === 'critical' && (
                      <span className={styles.badgeCritical}>Crítico</span>
                    )}
                    {item.status === 'warning' && (
                      <span className={styles.badgeWarning}>Alerta</span>
                    )}
                    {item.status === 'optimal' && (
                      <span className={styles.badgeOptimal}>Normal</span>
                    )}
                  </td>
                  <td>
                    <button
                      className={styles.btnTableAction}
                      onClick={() => handleGenerateOC(item)}
                      disabled={processingId === item.id || approvingAll}
                    >
                      {processingId === item.id ? 'Generando...' : 'Generar OC'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Feedback Visual y Auditoría */}
      {resultsModal && (
        <BatchApprovalModal
          open={resultsModal.open}
          onClose={() => setResultsModal(null)}
          count={resultsModal.count}
          summary={resultsModal.summary}
          results={resultsModal.results}
        />
      )}
    </div>
  );
}
