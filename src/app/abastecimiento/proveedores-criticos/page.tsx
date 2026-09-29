'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { ShieldAlert, Phone, Clock, ArrowRight, CheckCircle2, MessageSquare } from 'lucide-react';
import { RestockItem } from '@/services/RestockCalculatorService';

interface CriticalSupplier {
  provider: string;
  providerType: 'corporate' | 'traditional';
  providerPhone?: string;
  criticalSkuCount: number;
  skus: string[];
  totalInvestment: number;
  avgLeadTime: number;
}

export default function ProveedoresCriticosPage() {
  const [suppliers, setSuppliers] = useState<CriticalSupplier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/dashboard/reabastecimiento');
        if (res.ok) {
          const data = await res.json();
          if (data.items) {
            // Filtrar y agrupar por proveedores con SKUs en riesgo crítico
            const map = new Map<string, CriticalSupplier>();
            data.items.forEach((item: RestockItem) => {
              if (!map.has(item.provider)) {
                map.set(item.provider, {
                  provider: item.provider,
                  providerType: item.providerType,
                  providerPhone: item.providerPhone,
                  criticalSkuCount: 0,
                  skus: [],
                  totalInvestment: 0,
                  avgLeadTime: item.leadTimeDays,
                });
              }
              const sup = map.get(item.provider)!;
              if (item.status === 'critical' || item.coverageDays < 3.5) {
                sup.criticalSkuCount += 1;
              }
              sup.skus.push(item.name);
              sup.totalInvestment += item.investment;
            });

            // Ordenar por criticidad
            const list = Array.from(map.values()).sort(
              (a, b) => b.criticalSkuCount - a.criticalSkuCount
            );
            setSuppliers(list);
          }
        }
      } catch (e) {
        console.error('Error cargando proveedores críticos:', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <AppShell>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Encabezado */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#fee2e2', color: '#b91c1c', fontSize: '12px', fontWeight: 700, padding: '4px 10px', borderRadius: '999px' }}>
                <ShieldAlert size={14} />
                RED DE ABASTECIMIENTO
              </span>
              <span style={{ fontSize: '13px', color: 'var(--muted)' }}>Matriz de Proveedores Estratégicos</span>
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--ink)', margin: 0, letterSpacing: '-0.02em' }}>
              Proveedores Críticos
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--muted)', marginTop: '6px', marginBottom: 0 }}>
              Proveedores que suministran referencias con stock en quiebre inminente y requieren emisión prioritaria.
            </p>
          </div>

          <Link
            href="/estrategia/compras-recomendadas"
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
            <span>Emitir Pedidos de Compra</span>
            <ArrowRight size={16} />
          </Link>
        </div>

        {/* Tarjetas de Proveedores */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '20px' }}>
          {loading ? (
            <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: 'var(--muted)', background: 'var(--card)', borderRadius: '10px', border: '1px solid var(--line)' }}>
              Evaluando red de abastecimiento y SLA de entrega...
            </div>
          ) : suppliers.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: '#16a34a', background: 'var(--card)', borderRadius: '10px', border: '1px solid var(--line)' }}>
              <CheckCircle2 size={32} style={{ margin: '0 auto 8px', display: 'block' }} />
              Todos los proveedores tienen niveles óptimos de cumplimiento y stock.
            </div>
          ) : (
            suppliers.map((sup) => (
              <div
                key={sup.provider}
                style={{
                  background: 'var(--card)',
                  border: sup.criticalSkuCount > 0 ? '1px solid #fee2e2' : '1px solid var(--line)',
                  borderRadius: '10px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '16px', color: 'var(--ink)' }}>{sup.provider}</div>
                    <span style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'capitalize' }}>
                      Canal: {sup.providerType === 'corporate' ? 'Integración EDI / SAP' : 'Canal Tradicional'}
                    </span>
                  </div>

                  {sup.criticalSkuCount > 0 ? (
                    <span style={{ background: '#fee2e2', color: '#b91c1c', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '999px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <ShieldAlert size={12} />
                      {sup.criticalSkuCount} en quiebre
                    </span>
                  ) : (
                    <span style={{ background: '#f0fdf4', color: '#166534', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '999px' }}>
                      Estable
                    </span>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: 'var(--bg2)', padding: '12px', borderRadius: '10px', fontSize: '12px' }}>
                  <div>
                    <span style={{ color: 'var(--muted)', display: 'block' }}>Lead Time Promedio</span>
                    <span style={{ fontWeight: 700, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                      <Clock size={13} />
                      {sup.avgLeadTime} días hábiles
                    </span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--muted)', display: 'block' }}>Inversión Requerida</span>
                    <span style={{ fontWeight: 700, color: 'var(--color-forest-ink)', display: 'block', marginTop: '2px' }}>
                      PEN {sup.totalInvestment.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                  <strong>SKUs suministrados:</strong> {sup.skus.slice(0, 2).join(', ')}
                  {sup.skus.length > 2 ? ` y ${sup.skus.length - 2} más` : ''}
                </div>

                {sup.providerPhone && (
                  <div style={{ borderTop: '1px solid var(--line)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Phone size={13} />
                      {sup.providerPhone}
                    </span>
                    <a
                      href={`https://wa.me/${sup.providerPhone.replace(/\+/g, '')}?text=Estimado%20proveedor%20de%20${encodeURIComponent(sup.provider)},%20solicitamos%20cotizacion%20urgente%20de%20reposicion.`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#16a34a',
                        textDecoration: 'none',
                        background: '#f0fdf4',
                        padding: '6px 10px',
                        borderRadius: '6px',
                      }}
                    >
                      <MessageSquare size={13} />
                      WhatsApp B2B
                    </a>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}
