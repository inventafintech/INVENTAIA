'use client';

import { useEffect } from 'react';
import styles from './BatchApprovalModal.module.css';
import { BatchItemExecutionResult } from '@/services/BatchOrderApprovalService';

interface BatchApprovalModalProps {
  open: boolean;
  onClose: () => void;
  count: number;
  summary: string;
  results: BatchItemExecutionResult[];
}

export function BatchApprovalModal({
  open,
  onClose,
  count,
  summary,
  results,
}: BatchApprovalModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Cabecera del Modal */}
        <div className={styles.header}>
          <h2 className={styles.title}>Aprobación Masiva de Órdenes de Compra (1-Clic)</h2>
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Cerrar modal"
          >
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Subtítulo */}
        <p className={styles.subtitle}>
          {summary || `Se procesaron ${count} órdenes de compra en el motor de integraciones. Registros almacenados en sync_jobs e integration_logs.`}
        </p>

        {/* Lista Scrollable de Tarjetas de Resultado */}
        <div className={styles.cardsList}>
          {results.map((res, idx) => (
            <div key={idx} className={styles.card}>
              {/* Fila Superior: Producto, SKU y Número de OC */}
              <div className={styles.cardHeader}>
                <span className={styles.productTitle}>
                  {res.product} ({res.sku})
                </span>
                <span className={styles.poBadge}>{res.poNumber}</span>
              </div>

              {/* Mensaje de Respuesta de la API */}
              <div className={styles.cardMessage}>{res.message}</div>

              {/* Metadatos Inferiores */}
              <div className={styles.cardMeta}>
                <span>
                  Proveedor: <strong className={styles.metaValue}>{res.provider}</strong>
                </span>
                <span>
                  Conector: <strong className={styles.metaValue}>{res.connector}</strong>
                </span>
                <span>
                  Job ID: <span className={styles.jobIdValue}>{res.jobId}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
