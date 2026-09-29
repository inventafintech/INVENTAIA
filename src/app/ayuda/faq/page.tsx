'use client';

import React, { useState } from 'react';
import { CircleHelp, ChevronDown, ChevronUp } from 'lucide-react';
import styles from '@/app/dashboard/inventario/page.module.css';

const FAQS = [
  {
    q: '¿Cómo calcula la IA el pronóstico de demanda a 90 días?',
    a: 'Inventa.AI combina algoritmos de series temporales (Deep Learning) con estacionalidad de consumo, lead times de proveedores y picos históricos de venta. Además, evalúa factores de dispersión para crear intervalos de confianza con hasta 99.4% de exactitud.',
  },
  {
    q: '¿Qué significa que un SKU esté en "Riesgo de Quiebre"?',
    a: 'Significa que al ritmo de venta actual, el inventario restante cubrirá menos días de los que demora el proveedor en reabastecer el producto (Días Restantes < Lead Time del proveedor). Requiere emitir una orden de compra de inmediato.',
  },
  {
    q: '¿Cómo funciona la aprobación de Órdenes de Compra con 1-Clic?',
    a: 'Al hacer clic en "Aprobar OC", el sistema genera el documento oficial de compra en PDF, actualiza el estatus en base de datos y, si está configurada la integración de correo o EDI, envía la solicitud directamente a tu proveedor.',
  },
  {
    q: '¿Cómo se solicitan las líneas de financiamiento?',
    a: 'En el módulo de "Financiamiento Disponible", puedes seleccionar la línea de crédito aprobada con tu banco aliado, ingresar el monto requerido respaldado por tu orden de compra y solicitar el desembolso con tasas preferenciales.',
  },
  {
    q: '¿Puedo integrar Inventa.AI con mi ERP actual?',
    a: 'Sí. Disponemos de conectores listos para Shopify, MercadoLibre, Amazon, WooCommerce, y endpoints API REST para SAP S/4HANA, Oracle Netsuite y sistemas ERP locales.',
  },
];

export default function FaqPage() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIdx(openIdx === idx ? null : idx);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Preguntas Frecuentes (FAQ)</h1>
          <p className={styles.subtitle}>
            Respuestas a las dudas más comunes sobre el funcionamiento de Inventa.AI, IA predictiva y financiamiento.
          </p>
        </div>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '840px' }}>
        {FAQS.map((faq, idx) => {
          const isOpen = openIdx === idx;
          return (
            <div key={idx} className={styles.tableCard} style={{ padding: '0', overflow: 'hidden' }}>
              <button
                type="button"
                onClick={() => toggle(idx)}
                style={{
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '18px 24px',
                  background: isOpen ? 'var(--color-paper)' : '#ffffff',
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '14.5px',
                  fontWeight: 600,
                  color: 'var(--color-obsidian)',
                  transition: 'background-color 0.15s ease'
                }}
              >
                <span>{faq.q}</span>
                {isOpen ? <ChevronUp size={18} color="var(--color-slate)" /> : <ChevronDown size={18} color="var(--color-slate)" />}
              </button>
              {isOpen && (
                <div style={{ padding: '16px 24px 20px 24px', fontSize: '13.5px', color: 'var(--color-charcoal)', lineHeight: 1.6, borderTop: '1px solid var(--color-fog)' }}>
                  {faq.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
