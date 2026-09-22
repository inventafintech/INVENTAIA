'use client';

import { useState, useEffect } from 'react';
import { triggerNotificationRefresh } from '@/context/NotificationContext';
import styles from './page.module.css';

interface Order {
  id: string;
  order_number: string;
  supplier_id: string;
  supplier_name: string;
  condition: string;
  total_amount: number;
  estimated_arrival: string;
  status: 'draft' | 'approved' | 'transit' | 'received';
  created_at: string;
  lines_count: number;
}

interface POMetrics {
  porAprobar: number;
  enTransito: number;
  comprometidoMes: number;
  cumplimientoLeadTime: string;
}

interface Supplier {
  id: string;
  name: string;
  integration_type: 'corporate' | 'traditional';
}

interface AuditModalData {
  open: boolean;
  orderNumber: string;
  provider: string;
  integration: string;
  status: string;
  message: string;
  jobId: string;
}

export default function OrdenesPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [metrics, setMetrics] = useState<POMetrics>({
    porAprobar: 2,
    enTransito: 1,
    comprometidoMes: 226050,
    cumplimientoLeadTime: '96.8%',
  });
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Modals state
  const [auditModal, setAuditModal] = useState<AuditModalData | null>(null);
  const [newOrderModal, setNewOrderModal] = useState<boolean>(false);

  // New Order Form state
  const [selectedSupplier, setSelectedSupplier] = useState<string>('sup-alicorp');
  const [condition, setCondition] = useState<string>('Crédito 30d');
  const [estimatedArrival, setEstimatedArrival] = useState<string>('28 Sep 2026');
  const [lineSku, setLineSku] = useState<string>('SKU-ALI-001');
  const [lineProduct, setLineProduct] = useState<string>('Aceite Primor Premium 1L');
  const [lineQty, setLineQty] = useState<number>(2000);
  const [linePrice, setLinePrice] = useState<number>(8.50);

  // Load orders and metrics from backend
  const loadOrders = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/dashboard/ordenes', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.orders) setOrders(data.orders);
        if (data.metrics) setMetrics(data.metrics);
        if (data.suppliers) setSuppliers(data.suppliers);
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  // Handle Approve Order
  const handleApprove = async (order: Order) => {
    try {
      setActionLoadingId(order.id);
      const res = await fetch(`/api/dashboard/ordenes/${order.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail: 'operaciones@distribuidorasanmartin.pe' }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setAuditModal({
          open: true,
          orderNumber: order.order_number,
          provider: order.supplier_name,
          integration: data.integration === 'sap' ? 'SAP S/4HANA OData' : 'Meta WhatsApp Cloud API',
          status: data.status,
          message: data.message,
          jobId: data.jobId,
        });
        // Reload data to reflect state and dynamic metrics
        await loadOrders();
        triggerNotificationRefresh();
      } else {
        alert(data.error || 'Error al aprobar la orden de compra');
      }
    } catch (err: any) {
      alert(`Error de red: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Download PDF
  const handleDownloadPdf = (orderNumber: string) => {
    window.open(`/api/dashboard/ordenes/${orderNumber}/pdf`, '_blank');
  };

  // Handle Create Order
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        supplierId: selectedSupplier,
        condition,
        estimatedArrival,
        lines: [
          {
            sku: lineSku,
            product_name: lineProduct,
            quantity: Number(lineQty),
            unit_price: Number(linePrice),
          },
        ],
      };

      const res = await fetch('/api/dashboard/ordenes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setNewOrderModal(false);
        await loadOrders();
        triggerNotificationRefresh();
      } else {
        alert(data.error || 'Error al crear orden');
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
          <h1 className={styles.title}>Órdenes de Compra (OC)</h1>
          <p className={styles.subtitle}>
            Control ejecutivo de compras, trazabilidad de entregas y conciliación con proveedores.
          </p>
        </div>
        <button
          className={styles.btnPrimary}
          onClick={() => setNewOrderModal(true)}
        >
          + Nueva Orden
        </button>
      </header>

      {/* Tarjetas KPI Dinámicas */}
      <div className={styles.summaryCards}>
        <div className={styles.card}>
          <span className={styles.cardTitle}>POR APROBAR</span>
          <span className={styles.cardValue}>{metrics.porAprobar}</span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardTitle}>EN TRÁNSITO</span>
          <span className={styles.cardValue}>{metrics.enTransito}</span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardTitle}>COMPROMETIDO (MES)</span>
          <span className={styles.cardValue}>
            S/ {metrics.comprometidoMes.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardTitle}>CUMPLIMIENTO LEAD TIME</span>
          <span className={styles.cardValue}>{metrics.cumplimientoLeadTime}</span>
        </div>
      </div>

      {/* Tabla de Datos (Data Grid) */}
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
            {loading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                  Cargando órdenes de compra en tiempo real...
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id}>
                  <td className={styles.orderNumber}>{order.order_number}</td>
                  <td className={styles.providerName}>{order.supplier_name}</td>
                  <td className={styles.linesText}>{order.lines_count} SKUs</td>
                  <td className={styles.conditionText}>{order.condition}</td>
                  <td className={styles.totalAmount}>
                    S/ {order.total_amount.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className={styles.arrivalText}>{order.estimated_arrival}</td>
                  <td>
                    {order.status === 'draft' && (
                      <span className={styles.badgeDraft}>Borrador</span>
                    )}
                    {order.status === 'approved' && (
                      <span className={styles.badgeApproved}>Aprobada</span>
                    )}
                    {order.status === 'transit' && (
                      <span className={styles.badgeTransit}>En Tránsito</span>
                    )}
                    {order.status === 'received' && (
                      <span className={styles.badgeReceived}>Recibida</span>
                    )}
                  </td>
                  <td>
                    {order.status === 'draft' ? (
                      <button
                        className={styles.btnAction}
                        onClick={() => handleApprove(order)}
                        disabled={actionLoadingId === order.id}
                      >
                        {actionLoadingId === order.id ? 'Aprobando...' : 'Aprobar'}
                      </button>
                    ) : (
                      <button
                        className={styles.btnAction}
                        onClick={() => handleDownloadPdf(order.order_number)}
                      >
                        PDF
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Auditoría de Aprobación */}
      {auditModal && auditModal.open && (
        <div className={styles.modalOverlay} onClick={() => setAuditModal(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Trazabilidad de Integración: {auditModal.orderNumber}</h3>
              <button className={styles.modalClose} onClick={() => setAuditModal(null)}>✕</button>
            </div>
            <div className={styles.auditCard}>
              <div className={styles.auditHeader}>
                <span className={styles.auditPoNumber}>{auditModal.orderNumber}</span>
                <span className={styles.badgeApproved}>Aprobada</span>
              </div>
              <p className={styles.auditMessage}>{auditModal.message}</p>
              <div className={styles.auditMeta}>
                <span>Proveedor: <strong>{auditModal.provider}</strong></span>
                <span>Canal: <strong>{auditModal.integration}</strong></span>
                <span>Job ID: <code>{auditModal.jobId}</code></span>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button
                className={styles.btnAction}
                style={{ background: 'var(--primary)', color: 'var(--bg)' }}
                onClick={() => setAuditModal(null)}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nueva Orden */}
      {newOrderModal && (
        <div className={styles.modalOverlay} onClick={() => setNewOrderModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Crear Nueva Orden de Compra</h3>
              <button className={styles.modalClose} onClick={() => setNewOrderModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateOrder}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Proveedor</label>
                <select
                  className={styles.select}
                  value={selectedSupplier}
                  onChange={(e) => setSelectedSupplier(e.target.value)}
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.integration_type === 'corporate' ? 'SAP OData' : 'WhatsApp Cloud API'})
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Condición de Pago</label>
                <select
                  className={styles.select}
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                >
                  <option value="Crédito 30d">Crédito 30d</option>
                  <option value="Crédito 15d">Crédito 15d</option>
                  <option value="Crédito 45d">Crédito 45d</option>
                  <option value="Factoring Pichincha">Factoring Pichincha</option>
                  <option value="Contado Anticipado">Contado Anticipado</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Fecha Estimada de Llegada</label>
                <input
                  type="text"
                  className={styles.input}
                  value={estimatedArrival}
                  onChange={(e) => setEstimatedArrival(e.target.value)}
                  placeholder="ej. 28 Sep 2026"
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Línea de Pedido Inicial</label>
                <div className={styles.linesContainer}>
                  <div className={styles.lineRow}>
                    <input
                      type="text"
                      className={styles.input}
                      value={lineProduct}
                      onChange={(e) => setLineProduct(e.target.value)}
                      placeholder="Producto"
                      required
                    />
                    <input
                      type="number"
                      className={styles.input}
                      value={lineQty}
                      onChange={(e) => setLineQty(Number(e.target.value))}
                      placeholder="Cantidad"
                      min="1"
                      required
                    />
                    <input
                      type="number"
                      step="0.01"
                      className={styles.input}
                      value={linePrice}
                      onChange={(e) => setLinePrice(Number(e.target.value))}
                      placeholder="P. Unit"
                      min="0.01"
                      required
                    />
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    Subtotal estimado: S/ {(lineQty * linePrice).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setNewOrderModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={styles.btnPrimary}
                >
                  Emitir Orden
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
