'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { AlertTriangle, TrendingDown, ArrowRight, ShieldAlert, CheckCircle2, Clock } from 'lucide-react';
import { RestockItem } from '@/services/RestockCalculatorService';

export default function RiesgoQuiebrePage() {
  const [items, setItems] = useState<RestockItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/dashboard/reabastecimiento');
        if (res.ok) {
          const data = await res.json();
          if (data.items) {
            // Filtrar SKUs en riesgo de quiebre (cobertura < 7 días)
            const riskItems = data.items.filter(
              (i: RestockItem) => i.status === 'critical' || i.coverageDays < 7.0
            );
            setItems(riskItems);
          }
        }
      } catch (e) {
        console.error('Error cargando riesgo de quiebre:', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <AppShell>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Encabezado Estratégico */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#fee2e2', color: '#b91c1c', fontSize: '12px', fontWeight: 700, padding: '4px 10px', borderRadius: '999px' }}>
                <ShieldAlert size={14} />
                ESTRATEGIA & IA
              </span>
              <span style={{ fontSize: '13px', color: 'var(--muted)' }}>Monitoreo en Tiempo Real</span>
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--ink)', margin: 0, letterSpacing: '-0.02em' }}>
              Riesgo de Quiebre de Stock
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--muted)', marginTop: '6px', marginBottom: 0 }}>
              Detección algorítmica de SKUs con cobertura inferior al Lead Time de reabastecimiento.
            </p>
          </div>

          <Link
            href="/estrategia/compras-recomendadas"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              padding: '10px 18px',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '14px',
              textDecoration: 'none',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            }}
          >
            <span>Generar Órdenes de Compra</span>
            <ArrowRight size={16} />
          </Link>
        </div>

        {/* Métricas Resumen */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          <div style={{ background: 'var(--card)', border: '1px solid #fee2e2', borderRadius: '12px', padding: '20px', borderLeft: '4px solid #ef4444' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#991b1b', textTransform: 'uppercase' }}>SKUs en Riesgo Crítico</div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--ink)', marginTop: '6px' }}>
              {loading ? '...' : items.filter((i) => i.status === 'critical').length}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>Cobertura menor a 3.5 días</div>
          </div>

          <div style={{ background: 'var(--card)', border: '1px solid #fef3c7', borderRadius: '12px', padding: '20px', borderLeft: '4px solid #f59e0b' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#92400e', textTransform: 'uppercase' }}>En Advertencia</div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--ink)', marginTop: '6px' }}>
              {loading ? '...' : items.filter((i) => i.status === 'warning').length}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>Cobertura entre 3.5 y 7 días</div>
          </div>

          <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '12px', padding: '20px', borderLeft: '4px solid #3b82f6' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#1e40af', textTransform: 'uppercase' }}>Proveedores Implicados</div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--ink)', marginTop: '6px' }}>
              {loading ? '...' : new Set(items.map((i) => i.provider)).size}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>Requieren emisión de pedido</div>
          </div>
        </div>

        {/* Tabla de SKUs en Riesgo */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--ink)' }}>Listado de SKUs en Alerta</span>
            <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Basado en consumo de los últimos 30 días</span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--line)', color: 'var(--muted)', fontWeight: 600 }}>
                  <th style={{ padding: '12px 16px' }}>SKU / Producto</th>
                  <th style={{ padding: '12px 16px' }}>Proveedor</th>
                  <th style={{ padding: '12px 16px' }}>Stock Actual</th>
                  <th style={{ padding: '12px 16px' }}>Velocidad Diaria</th>
                  <th style={{ padding: '12px 16px' }}>Lead Time</th>
                  <th style={{ padding: '12px 16px' }}>Cobertura</th>
                  <th style={{ padding: '12px 16px' }}>Sugerido ROP</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: 'var(--muted)' }}>
                      Analizando niveles de stock y predicción de demanda...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#16a34a' }}>
                      <CheckCircle2 size={24} style={{ margin: '0 auto 8px', display: 'block' }} />
                      No hay productos en riesgo de quiebre en este momento.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--line)' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{item.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{item.sku}</div>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--ink)' }}>{item.provider}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--ink)' }}>{item.currentStock} uds</td>
                      <td style={{ padding: '12px 16px', color: 'var(--muted)' }}>{item.dailyVelocity} u/día</td>
                      <td style={{ padding: '12px 16px', color: 'var(--muted)' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={13} />
                          {item.leadTimeDays}d
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 700,
                            background: item.coverageDays < 3.5 ? '#fee2e2' : '#fef3c7',
                            color: item.coverageDays < 3.5 ? '#b91c1c' : '#b45309',
                          }}
                        >
                          <AlertTriangle size={12} />
                          {item.coverageDays} días
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#2563eb' }}>
                        +{item.suggestedQty} uds
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
