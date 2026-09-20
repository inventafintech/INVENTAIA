'use client';

import { useState, useEffect, useMemo } from 'react';
import styles from './page.module.css';

interface CreditLine {
  id: string;
  partner_bank_name: string;
  total_amount: number;
  available_amount: number;
  used_amount: number;
  monthly_interest_rate: number;
  status: string;
  active_orders_description: string;
}

interface DisbursementResponse {
  success: boolean;
  status: 'approved' | 'pending_configuration' | 'failed';
  message: string;
  error?: string;
  jobId?: string;
}

export default function FinanciamientoPage() {
  const [creditLine, setCreditLine] = useState<CreditLine>({
    id: 'cl-pichincha',
    partner_bank_name: 'Banco Pichincha B2B',
    total_amount: 150000.00,
    available_amount: 105000.00,
    used_amount: 45000.00,
    monthly_interest_rate: 0.0145,
    status: 'active',
    active_orders_description: '1 Orden activa (Alicorp #OC-089)',
  });

  // Slider state
  const [amount, setAmount] = useState<number>(45000);
  const [term, setTerm] = useState<number>(30);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [resultModal, setResultModal] = useState<DisbursementResponse | null>(null);

  // Load real credit line data
  useEffect(() => {
    async function loadFinancing() {
      try {
        const res = await fetch('/api/dashboard/financiamiento', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data.creditLine) {
            setCreditLine(data.creditLine);
          }
        }
      } catch (err) {
        console.error('Error loading financing data:', err);
      }
    }
    loadFinancing();
  }, []);

  // Real-time financial calculations (Anticipo de Inventarios)
  const monthlyRate = creditLine.monthly_interest_rate || 0.0145;

  const financialCost = useMemo(() => {
    return Math.round(amount * (monthlyRate / 30) * term);
  }, [amount, monthlyRate, term]);

  const protectedSales = useMemo(() => {
    return Math.round(amount * 1.35); // Margen comercial B2B 35%
  }, [amount]);

  const netReturn = useMemo(() => {
    return protectedSales - financialCost - amount;
  }, [protectedSales, financialCost, amount]);

  // Handle disbursement request
  const handleRequestDisbursement = async () => {
    try {
      setSubmitting(true);
      const res = await fetch('/api/dashboard/financiamiento/desembolso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          termDays: term,
          userEmail: 'operaciones@distribuidorasanmartin.pe',
        }),
      });

      const data = await res.json();
      setResultModal(data);
    } catch (err: any) {
      alert(`Error de red: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Capital de Trabajo & Financiamiento</h1>
          <p className={styles.subtitle}>
            Líneas de crédito pre-aprobadas y factoring automático para asegurar la compra de inventario crítico.
          </p>
        </div>
      </header>

      {/* Tarjetas de Resumen Financiero */}
      <div className={styles.gridCards}>
        <div className={styles.card}>
          <span className={styles.cardTitle}>LÍNEA TOTAL APROBADA</span>
          <span className={styles.cardValue}>
            S/ {creditLine.total_amount.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className={styles.cardDesc}>
            {creditLine.partner_bank_name} • Tasa {(creditLine.monthly_interest_rate * 100).toFixed(2)}% m.
          </span>
        </div>

        <div className={styles.card}>
          <span className={styles.cardTitle}>DISPONIBLE INMEDIATO</span>
          <span className={`${styles.cardValue} ${styles.cardValueGreen}`}>
            S/ {creditLine.available_amount.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className={styles.cardDesc}>Desembolso en 4 horas hábiles</span>
        </div>

        <div className={styles.card}>
          <span className={styles.cardTitle}>CAPITAL UTILIZADO</span>
          <span className={styles.cardValue}>
            S/ {creditLine.used_amount.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className={styles.cardDesc}>{creditLine.active_orders_description}</span>
        </div>
      </div>

      {/* Simulador de Desembolso para Órdenes de Compra */}
      <div className={styles.simulatorCard}>
        <h2 className={styles.simTitle}>Simulador de Desembolso para Órdenes de Compra</h2>

        <div className={styles.simForm}>
          {/* Columna Izquierda: Sliders y Botón */}
          <div className={styles.controlsColumn}>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Monto a Financiar: <strong>S/ {amount.toLocaleString('es-PE')}</strong>
              </label>
              <input
                type="range"
                min="5000"
                max={creditLine.available_amount || 105000}
                step="1000"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className={styles.slider}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>
                Plazo de Pago: <strong>{term} días</strong>
              </label>
              <input
                type="range"
                min="15"
                max="90"
                step="15"
                value={term}
                onChange={(e) => setTerm(Number(e.target.value))}
                className={styles.slider}
              />
            </div>

            <button
              className={styles.btnPrimary}
              onClick={handleRequestDisbursement}
              disabled={submitting}
            >
              {submitting ? 'Procesando Solicitud...' : 'Solicitar Desembolso Inmediato'}
            </button>
          </div>

          {/* Columna Derecha: Panel de Retorno Financiero */}
          <div className={styles.simResult}>
            <div className={styles.resultRow}>
              <span>Costo Financiero (Interés estimado):</span>
              <strong>S/ {financialCost.toLocaleString('es-PE')}</strong>
            </div>

            <div className={styles.resultRow}>
              <span>Ventas Protegidas (Evitando Quiebre):</span>
              <strong>S/ {protectedSales.toLocaleString('es-PE')}</strong>
            </div>

            <div className={`${styles.resultRow} ${styles.resultRowHighlight}`}>
              <span>Retorno Neto para la Empresa:</span>
              <span className={styles.netGainText}>
                +S/ {netReturn.toLocaleString('es-PE')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Respuesta de Integración Bancaria */}
      {resultModal && (
        <div className={styles.modalOverlay} onClick={() => setResultModal(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                {resultModal.status === 'approved'
                  ? 'Solicitud de Desembolso Aprobada'
                  : 'Estado de Integración Bancaria'}
              </h3>
              <button className={styles.modalClose} onClick={() => setResultModal(null)}>✕</button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.auditCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <strong>{creditLine.partner_bank_name}</strong>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '99px',
                    background: resultModal.status === 'approved' ? '#dcfce7' : '#fef3c7',
                    color: resultModal.status === 'approved' ? '#15803d' : '#b45309',
                  }}>
                    {resultModal.status === 'approved' ? 'Aprobado' : 'Pendiente de configuración'}
                  </span>
                </div>
                <p style={{ margin: 0, lineHeight: 1.4 }}>{resultModal.message}</p>
                <div style={{ marginTop: '8px', fontSize: '11px', color: '#64748b', display: 'flex', gap: '14px' }}>
                  <span>Monto: <strong>S/ {amount.toLocaleString('es-PE')}</strong></span>
                  <span>Plazo: <strong>{term} días</strong></span>
                  <span>Interés: <strong>S/ {financialCost.toLocaleString('es-PE')}</strong></span>
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                className={styles.btnPrimary}
                onClick={() => setResultModal(null)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
