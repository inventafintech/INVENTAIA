'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Boxes, ArrowRight, CheckCircle2 } from 'lucide-react';
import { InventoryMasterItem } from '@/services/InventoryMasterService';

export default function InventarioInmovilizadoPage() {
  const [items, setItems] = useState<InventoryMasterItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/dashboard/inventario');
        if (res.ok) {
          const data = await res.json();
          if (data.items) {
            // Filtrar SKUs inmovilizados / alto volumen de stock
            const inmovilizados = data.items.filter(
              (i: InventoryMasterItem) =>
                (i.physicalStock || 0) > 400 || i.health === 'healthy'
            );
            setItems(inmovilizados);
          }
        }
      } catch (e) {
        console.error('Error cargando inventario inmovilizado:', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const totalTiedCapital = items.reduce(
    (acc, curr) => acc + (curr.totalValue || (curr.physicalStock || 0) * (curr.unitCost || 10)),
    0
  );

  return (
    <AppShell>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Encabezado */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#fef3c7', color: '#92400e', fontSize: '12px', fontWeight: 700, padding: '4px 10px', borderRadius: '999px' }}>
                <Boxes size={14} />
                INVENTARIO & FINANZAS
              </span>
              <span style={{ fontSize: '13px', color: 'var(--muted)' }}>Optimización de Capital de Trabajo</span>
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--ink)', margin: 0, letterSpacing: '-0.02em' }}>
              Inventario Inmovilizado & Exceso
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--muted)', marginTop: '6px', marginBottom: 0 }}>
              Identificación de productos con rotación reducida que generan costo financiero y ocupación de almacén.
            </p>
          </div>

          <Link
            href="/finanzas/financiamiento-disponible"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'var(--primary)',
              color: 'var(--bg)',
              padding: '10px 18px',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '14px',
              textDecoration: 'none',
            }}
          >
            <span>Ver Financiamiento Disponible</span>
            <ArrowRight size={16} />
          </Link>
        </div>

        {/* Tarjetas de Métricas Financieras */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '12px', padding: '20px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>Capital Inmovilizado Estimado</div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--ink)', marginTop: '6px' }}>
              PEN {loading ? '...' : totalTiedCapital.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '12px', color: '#b45309', marginTop: '4px' }}>Fondos representados en stock</div>
          </div>

          <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '12px', padding: '20px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>SKUs con Alta Disponibilidad</div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--ink)', marginTop: '6px' }}>
              {loading ? '...' : items.length}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>Stock holgado en almacén</div>
          </div>

          <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '12px', padding: '20px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>Acción Recomendada</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#2563eb', marginTop: '6px' }}>
              Priorizar Ventas & Evitar Reorden
            </div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>Acelerar rotación para liberar caja</div>
          </div>
        </div>

        {/* Tabla de Productos */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--ink)' }}>Detalle de SKUs</span>
            <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Sincronizado con almacén central</span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--line)', color: 'var(--muted)', fontWeight: 600 }}>
                  <th style={{ padding: '12px 16px' }}>SKU / Nombre</th>
                  <th style={{ padding: '12px 16px' }}>Categoría</th>
                  <th style={{ padding: '12px 16px' }}>Stock Físico</th>
                  <th style={{ padding: '12px 16px' }}>Costo Unitario</th>
                  <th style={{ padding: '12px 16px' }}>Valor Total</th>
                  <th style={{ padding: '12px 16px' }}>Diagnóstico</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: 'var(--muted)' }}>
                      Cargando análisis de inventario...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: 'var(--muted)' }}>
                      No se detectó inventario inmovilizado.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--line)' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{item.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{item.sku}</div>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--ink)' }}>{item.category || 'General'}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--ink)' }}>{item.physicalStock} uds</td>
                      <td style={{ padding: '12px 16px', color: 'var(--muted)' }}>PEN {item.unitCost?.toFixed(2) || '10.00'}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#b45309' }}>
                        PEN {(item.totalValue || (item.physicalStock || 0) * (item.unitCost || 10)).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fef3c7', color: '#92400e', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600 }}>
                          Stock Estable
                        </span>
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
