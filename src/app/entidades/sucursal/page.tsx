'use client';

import React from 'react';
import { Building2, MapPin, Phone, Mail, Clock, UserCheck } from 'lucide-react';
import styles from '@/app/dashboard/inventario/page.module.css';

export default function SucursalPage() {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Detalles de la Sucursal</h1>
          <p className={styles.subtitle}>
            Información operativa, capacidad física y datos de contacto de la sede central de distribución.
          </p>
        </div>
      </header>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>SEDE PRINCIPAL</span>
          <span className={styles.statValue}>Sede Lima Central</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>CAPACIDAD ALMACÉN</span>
          <span className={styles.statValue}>4,500 m³</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>OCUPACIÓN ACTUAL</span>
          <span className={styles.statValue}>68%</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>ESTADO OPERATIVO</span>
          <span className={styles.statValue} style={{ color: '#16a34a' }}>Activa 24/7</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div className={styles.tableCard} style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building2 size={18} color="#3b82f6" /> Datos Generales de la Sucursal
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
              <span style={{ color: '#64748b' }}>Razón Social:</span>
              <strong style={{ color: '#0f172a' }}>INVENTA LOGISTICS PERU S.A.C.</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
              <span style={{ color: '#64748b' }}>RUC:</span>
              <strong style={{ color: '#0f172a' }}>20609876543</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
              <span style={{ color: '#64748b' }}>Código de Establecimiento SUNAT:</span>
              <strong style={{ color: '#0f172a' }}>0001 (Principal)</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
              <span style={{ color: '#64748b' }}>Dirección Fiscal:</span>
              <strong style={{ color: '#0f172a' }}>Av. Elmer Faucett 2850, Callao, Lima</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>Horario de Recepción:</span>
              <strong style={{ color: '#0f172a' }}>Lun - Sáb: 06:00 - 22:00</strong>
            </div>
          </div>
        </div>

        <div className={styles.tableCard} style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserCheck size={18} color="#16a34a" /> Responsables & Contacto
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
              <span style={{ color: '#64748b' }}>Gerente de Operaciones:</span>
              <strong style={{ color: '#0f172a' }}>Ing. Carlos Mendoza R.</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
              <span style={{ color: '#64748b' }}>Jefe de Almacén:</span>
              <strong style={{ color: '#0f172a' }}>Marcos Vílchez T.</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
              <span style={{ color: '#64748b' }}>Teléfono Central:</span>
              <strong style={{ color: '#0f172a' }}>+51 (1) 710-4400</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
              <span style={{ color: '#64748b' }}>Email de Operaciones:</span>
              <strong style={{ color: '#0f172a' }}>operaciones@inventa.ai</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>Soporte de Conexión EDI/ERP:</span>
              <strong style={{ color: '#16a34a' }}>En línea (Sincronizado)</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
