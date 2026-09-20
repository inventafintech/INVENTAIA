'use client';

import { useState } from 'react';
import styles from './page.module.css';

export default function FinanciamientoPage() {
  const [amount, setAmount] = useState(45000);
  const [term, setTerm] = useState(30);

  const monthlyRate = 0.0145; // 1.45% mensual
  const interestCost = Math.round(amount * (monthlyRate * (term / 30)));
  const protectedSales = Math.round(amount * 1.35); // Margen comercial promedio 35%
  const netGain = protectedSales - amount - interestCost;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Capital de Trabajo & Financiamiento</h1>
          <p className={styles.subtitle}>
            Líneas de crédito pre-aprobadas y factoring automático para asegurar la compra de inventario crítico.
          </p>
        </div>
      </header>

      <div className={styles.gridCards}>
        <div className={styles.card}>
          <span className={styles.cardTitle}>Línea Total Aprobada</span>
          <span className={styles.cardValue}>S/ 150,000.00</span>
          <span className={styles.cardDesc}>Banco Pichincha B2B • Tasa 1.45% m.</span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardTitle}>Disponible Inmediato</span>
          <span className={styles.cardValue} style={{ color: '#059669' }}>S/ 105,000.00</span>
          <span className={styles.cardDesc}>Desembolso en 4 horas hábiles</span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardTitle}>Capital Utilizado</span>
          <span className={styles.cardValue}>S/ 45,000.00</span>
          <span className={styles.cardDesc}>1 Orden activa (Alicorp #OC-089)</span>
        </div>
      </div>

      <div className={styles.simulatorCard}>
        <h2 className={styles.simTitle}>Simulador de Desembolso para Órdenes de Compra</h2>
        
        <div className={styles.simForm}>
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Monto a Financiar: <strong>S/ {amount.toLocaleString()}</strong>
            </label>
            <input 
              type="range" 
              min="5000" 
              max="105000" 
              step="5000"
              value={amount} 
              onChange={(e) => setAmount(Number(e.target.value))}
              className={styles.slider}
            />
            
            <label className={styles.label} style={{ marginTop: '16px' }}>
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

          <div className={styles.simResult}>
            <div className={styles.resultRow}>
              <span>Costo Financiero (Interés estimado):</span>
              <strong>S/ {interestCost.toLocaleString()}</strong>
            </div>
            <div className={styles.resultRow}>
              <span>Ventas Protegidas (Evitando Quiebre):</span>
              <strong>S/ {protectedSales.toLocaleString()}</strong>
            </div>
            <div className={styles.resultRow} style={{ borderTop: '1px solid var(--line)', paddingTop: '10px' }}>
              <span style={{ fontWeight: 600 }}>Retorno Neto para la Empresa:</span>
              <strong style={{ color: '#059669', fontSize: '18px' }}>
                +S/ {netGain.toLocaleString()}
              </strong>
            </div>
          </div>
        </div>

        <button 
          className={styles.btnPrimary}
          onClick={() => alert(`Solicitud de desembolso por S/ ${amount.toLocaleString()} enviada al Banco Pichincha con pre-aprobación instantánea.`)}
        >
          Solicitar Desembolso Inmediato
        </button>
      </div>
    </div>
  );
}
