'use client';

import React from 'react';
import { BookOpen, CheckCircle, Lightbulb, Zap } from 'lucide-react';
import styles from '@/app/dashboard/inventario/page.module.css';

const GUIDES = [
  {
    step: 'Paso 1',
    title: 'Interpretar el Centro de Control Ejecutivo',
    desc: 'El dashboard principal responde a las 3 preguntas clave de abastecimiento: ¿Qué productos están en riesgo de quiebre? ¿Cuánto capital demandará la reposición en 30 días? y ¿Qué órdenes de compra sugeridas por IA están listas para aprobación con 1 clic?',
  },
  {
    step: 'Paso 2',
    title: 'Aprobación de Órdenes de Compra con 1-Clic',
    desc: 'En la sección "Compras Recomendadas" o en "Actividad reciente", revisa las OC generadas Just-in-Time según la demanda prevista. Puedes aprobarlas individualmente o en lote para sincronizarlas con tu ERP o enviarlas directamente al proveedor.',
  },
  {
    step: 'Paso 3',
    title: 'Activación de Financiamiento y Líneas de Crédito',
    desc: 'Si el capital requerido para reponer stock supera tu liquidez inmediata, accede a "Financiamiento Disponible" para solicitar un desembolso rotativo vinculado a la factura comercial de compra.',
  },
  {
    step: 'Paso 4',
    title: 'Sincronización de Catálogo e Integraciones Oficiales',
    desc: 'Conecta tus canales de venta (Shopify, MercadoLibre, Amazon) o tu ERP (SAP, Oracle) desde la pestaña de Complementos para mantener el inventario físico y virtual sincronizado en tiempo real.',
  },
];

export default function GuiaPage() {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Guía del Usuario · INVENTA.AI</h1>
          <p className={styles.subtitle}>
            Manual rápido para maximizar la rentabilidad de compras, reducir mermas y eliminar quiebres de stock.
          </p>
        </div>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '840px' }}>
        {GUIDES.map((g, idx) => (
          <div key={idx} className={styles.tableCard} style={{ padding: '20px 24px', display: 'flex', gap: '18px', alignItems: 'flex-start' }}>
            <div style={{
              background: 'var(--color-linen-mist)',
              color: 'var(--color-forest-ink)',
              fontWeight: 800,
              fontSize: '12px',
              padding: '6px 12px',
              borderRadius: '6px',
              flexShrink: 0,
              letterSpacing: '0.04em'
            }}>
              {g.step}
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-obsidian)', marginBottom: '6px' }}>{g.title}</h3>
              <p style={{ fontSize: '13px', color: 'var(--color-charcoal)', lineHeight: 1.6 }}>{g.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
