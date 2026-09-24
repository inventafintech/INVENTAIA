'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Star, Check, X as XIcon, ExternalLink } from 'lucide-react';
import { PLANS, MATRIX, formatPlanPrice, CellValue, PlanId } from '@/lib/plans';

const CURRENT_PLAN: PlanId = 'light';

function MatrixCell({ value }: { value: CellValue }) {
  if (value === 'check') {
    return <Check size={15} color="#16a34a" style={{ margin: '0 auto', display: 'block' }} />;
  }
  if (value === 'cross') {
    return <XIcon size={14} color="#cbd5e1" style={{ margin: '0 auto', display: 'block' }} />;
  }
  if (value === 'addon') {
    return (
      <span style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '0.03em', color: '#c2410c', background: '#fff7ed', padding: '3px 7px', borderRadius: '999px', whiteSpace: 'nowrap' }}>
        COMPLEMENTO
      </span>
    );
  }
  if (value === 'sales') {
    return (
      <span style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '0.03em', color: '#1d4ed8', background: '#eff6ff', padding: '3px 7px', borderRadius: '999px', whiteSpace: 'nowrap' }}>
        VÍA EQUIPO DE VENTAS
      </span>
    );
  }
  return <span style={{ fontSize: '12px', color: '#475569', fontVariantNumeric: 'tabular-nums' }}>{value}</span>;
}

export default function PlansView() {
  const router = useRouter();
  const [cycle, setCycle] = useState<'mensual' | 'anual'>('anual');

  useEffect(() => {
    fetch('/api/billing/addons', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.billing?.billingCycle) setCycle(data.billing.billingCycle);
      })
      .catch(() => {});
  }, []);

  const handleCycle = async (next: 'mensual' | 'anual') => {
    if (next === cycle) return;
    setCycle(next);
    try {
      await fetch('/api/billing/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cycle: next }),
      });
    } catch {
      // preferencia visual conservada
    }
  };

  const priceOf = (planId: PlanId): string => {
    const plan = PLANS.find((p) => p.id === planId)!;
    if (plan.monthlyPrice === 0) return 'Gratis';
    if (plan.monthlyPrice === null) return 'Contacto Ventas';
    const amount = cycle === 'anual' ? plan.annualMonthlyPrice ?? plan.monthlyPrice : plan.monthlyPrice;
    return formatPlanPrice(amount);
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.04em', color: '#64748b' }}>
        FACTURACIÓN / COMPARAR PLANES
      </span>

      {/* Header */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px 22px', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
        <span style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#f1f5f9', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', flexShrink: 0 }}>
          <Star size={20} />
        </span>
        <div style={{ flex: 1, minWidth: '180px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', color: '#94a3b8' }}>SUSCRIPCIÓN</div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '2px 0 0 0' }}>Comparar Planes</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '4px' }} role="group" aria-label="Ciclo de facturación">
          {(['mensual', 'anual'] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => handleCycle(c)}
              aria-pressed={cycle === c}
              style={{
                border: 'none',
                background: cycle === c ? '#ffffff' : 'transparent',
                boxShadow: cycle === c ? '0 1px 2px rgba(15,23,42,0.12)' : 'none',
                borderRadius: '7px',
                padding: '8px 14px',
                minHeight: '44px',
                fontSize: '13px',
                fontWeight: cycle === c ? 700 : 500,
                color: cycle === c ? '#0f172a' : '#64748b',
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {c}
            </button>
          ))}
          <span style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.04em', color: '#15803d', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '4px 8px', borderRadius: '999px', whiteSpace: 'nowrap' }}>
            AHORRE 20%
          </span>
        </div>
      </div>

      <p style={{ fontSize: '13px', color: '#64748b', margin: 0, lineHeight: 1.6, maxWidth: '900px' }}>
        Elige el plan que coincida con los flujos de trabajo que necesitas ahora. La tabla distingue las funciones
        incluidas, las disponibles como complementos de autoservicio, los módulos activados por administrador y las
        gestionadas a través de ventas para un despliegue acotado.
      </p>

      {/* Plan cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', alignItems: 'stretch' }}>
        {PLANS.map((plan) => {
          const isCurrent = plan.id === CURRENT_PLAN;
          return (
            <div
              key={plan.id}
              style={{
                background: isCurrent ? '#f8fafc' : '#ffffff',
                border: `1px solid ${isCurrent ? '#bfdbfe' : '#e2e8f0'}`,
                borderRadius: '12px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              {plan.badge && (
                <span style={{ alignSelf: 'flex-start', fontSize: '9px', fontWeight: 800, letterSpacing: '0.04em', color: plan.highlighted ? '#1d4ed8' : '#15803d', background: plan.highlighted ? '#eff6ff' : '#f0fdf4', padding: '3px 8px', borderRadius: '999px' }}>
                  ★ {plan.badge}
                </span>
              )}
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>{plan.name}</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                {priceOf(plan.id)}
              </div>
              {plan.id === 'essential' && (
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                  {cycle === 'anual' ? '/mes, facturado anualmente' : '/mes, facturado mensualmente'}
                </div>
              )}
              <div style={{ fontSize: '13px', color: '#64748b', flex: 1 }}>{plan.tagline}</div>
              {plan.cta.kind === 'current' ? (
                <button type="button" disabled style={{ marginTop: '8px', background: '#f1f5f9', color: '#94a3b8', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px', minHeight: '44px', fontSize: '13px', fontWeight: 700, cursor: 'not-allowed' }}>
                  {plan.cta.label}
                </button>
              ) : plan.cta.kind === 'update' ? (
                <button
                  type="button"
                  onClick={() => router.push('/addons')}
                  style={{ marginTop: '8px', background: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px', minHeight: '44px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                >
                  {plan.cta.label}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => router.push('/addons')}
                  style={{ marginTop: '8px', background: plan.highlighted ? '#2563eb' : '#ffffff', color: plan.highlighted ? '#ffffff' : '#0f172a', border: plan.highlighted ? 'none' : '1px solid #cbd5e1', borderRadius: '8px', padding: '10px', minHeight: '44px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                >
                  {plan.cta.label}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Matriz */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px 4px 20px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', color: '#475569' }}>CARACTERÍSTICAS</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
            Qué incluye cada plan y en qué casos un módulo es un complemento
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: '760px', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ textAlign: 'left', padding: '12px 20px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: '#475569' }}>
                  CARACTERÍSTICAS
                </th>
                {['LIGHT', 'ESSENTIAL', 'PRO', 'ENTERPRISE'].map((h) => (
                  <th key={h} style={{ padding: '12px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: '#475569', textAlign: 'center', minWidth: '110px' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MATRIX.map((section, si) => (
                <React.Fragment key={si}>
                  {section.title && (
                    <tr>
                      <td colSpan={5} style={{ padding: '14px 20px 6px 20px', fontSize: '11px', fontWeight: 800, letterSpacing: '0.06em', color: '#0f172a', background: '#f8fafc' }}>
                        {section.title}
                      </td>
                    </tr>
                  )}
                  {section.rows.map((row) => (
                    <tr key={row.label} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 20px', color: '#334155' }}>{row.label}</td>
                      {row.values.map((v, vi) => (
                        <td key={vi} style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <MatrixCell value={v} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '14px 20px', borderTop: '1px solid #e2e8f0', fontSize: '10px', fontWeight: 600, letterSpacing: '0.03em', color: '#94a3b8', lineHeight: 1.8 }}>
          COMPLEMENTO = MÓDULO DE AUTOSERVICIO EN ESE PLAN · DIRIGIDO POR VENTAS = CONTACTA CON VENTAS O DESPLIEGUE ACOTADO
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 20px', borderTop: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '220px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', color: '#475569' }}>
              ¿NECESITA AYUDA PARA ELEGIR?
            </div>
            <div style={{ fontSize: '13px', color: '#64748b' }}>
              Nuestro equipo puede ayudarle a encontrar el plan perfecto para las necesidades de su negocio.
            </div>
          </div>
          <button
            type="button"
            onClick={() => router.push('/help/contact-support')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px 16px', minHeight: '44px', fontSize: '13px', fontWeight: 700, color: '#0f172a', cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            Contactar soporte <ExternalLink size={14} />
          </button>
          <button
            type="button"
            onClick={() => router.push('/addons')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#2563eb', border: 'none', borderRadius: '8px', padding: '10px 16px', minHeight: '44px', fontSize: '13px', fontWeight: 700, color: '#ffffff', cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            Hablar con Ventas <ExternalLink size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
