'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Coins, ArrowRight } from 'lucide-react';
import { RestockItem } from '@/services/RestockCalculatorService';

export default function CapitalRequeridoPage() {
  const [items, setItems] = useState<RestockItem[]>([]);
  const [totalCapital, setTotalCapital] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/dashboard/reabastecimiento');
        if (res.ok) {
          const data = await res.json();
          if (data.items) {
            setItems(data.items);
            const total = data.items.reduce((acc: number, curr: RestockItem) => acc + curr.investment, 0);
            setTotalCapital(total);
          }
        }
      } catch (e) {
        console.error('Error cargando capital requerido:', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Agrupar por proveedor
  const providerBreakdown = items.reduce((acc: Record<string, { count: number; total: number }>, curr) => {
    if (!acc[curr.provider]) {
      acc[curr.provider] = { count: 0, total: 0 };
    }
    acc[curr.provider].count += 1;
    acc[curr.provider].total += curr.investment;
    return acc;
  }, {});

  return (
    <AppShell>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Encabezado */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#e0f2fe', color: '#0369a1', fontSize: '12px', fontWeight: 700, padding: '4px 10px', borderRadius: '999px' }}>
                <Coins size={14} />
                INVENTARIO & FINANZAS
              </span>
              <span style={{ fontSize: '13px', color: 'var(--muted)' }}>Planificación de Flujo de Caja</span>
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--ink)', margin: 0, letterSpacing: '-0.02em' }}>
              Capital Requerido para Compras
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--muted)', marginTop: '6px', marginBottom: 0 }}>
              Estimación de liquidez necesaria para abastecer los lotes óptimos sugeridos por el algoritmo de reabastecimiento.
            </p>
          </div>

          <Link
            href="/finanzas/financiamiento-disponible"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'var(--color-forest-ink)',
              color: '#ffffff',
              padding: '10px 18px',
              borderRadius: '10px',
              fontWeight: 600,
              fontSize: '14px',
              textDecoration: 'none',
            }}
          >
            <span>Solicitar Línea de Financiamiento</span>
            <ArrowRight size={16} />
          </Link>
        </div>

        {/* Tarjetas Resumen */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '10px', padding: '20px', borderLeft: '4px solid var(--color-forest-ink)' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#1e40af', textTransform: 'uppercase' }}>Inversión Total Estimada</div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--ink)', marginTop: '6px' }}>
              PEN {loading ? '...' : totalCapital.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>Para 100% de órdenes sugeridas</div>
          </div>

          <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '10px', padding: '20px', borderLeft: '4px solid #16a34a' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#166534', textTransform: 'uppercase' }}>Retorno Proyectado (30d)</div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#16a34a', marginTop: '6px' }}>
              +38.5%
            </div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>Margen comercial promedio</div>
          </div>

          <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '10px', padding: '20px', borderLeft: '4px solid #8b5cf6' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b21a8', textTransform: 'uppercase' }}>Proveedores por Pagar</div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--ink)', marginTop: '6px' }}>
              {loading ? '...' : Object.keys(providerBreakdown).length}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>Negociación de plazos a 30-60 días</div>
          </div>
        </div>

        {/* Desglose por Proveedor */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '10px', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
            <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--ink)' }}>Distribución de Capital por Proveedor</span>
          </div>

          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {Object.entries(providerBreakdown).map(([provider, data]) => {
              const pct = totalCapital > 0 ? (data.total / totalCapital) * 100 : 0;
              return (
                <div key={provider} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600 }}>
                    <span style={{ color: 'var(--ink)' }}>{provider} ({data.count} SKUs)</span>
                    <span style={{ color: 'var(--color-forest-ink)' }}>
                      PEN {data.total.toLocaleString('es-PE', { minimumFractionDigits: 2 })} ({pct.toFixed(1)}%)
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'var(--bg2)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: 'var(--color-forest-ink)', borderRadius: '4px' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
