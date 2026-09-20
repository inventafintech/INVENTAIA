'use client';

import React from 'react';
import Link from 'next/link';
import { SlidersHorizontal, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';

interface PendingConfigStateProps {
  title: string;
  moduleName: string;
  description: string;
  requiredIntegration?: string;
  checklist?: string[];
  configUrl?: string;
}

export function PendingConfigState({
  title,
  moduleName,
  description,
  requiredIntegration = 'SAP / ERP o Canal de Venta',
  checklist = [
    'Conexión API activa con las credenciales de empresa',
    'Mapeo de catálogo de productos y SKUs sincronizado',
    'Permisos de lectura/escritura en webhook de eventos',
  ],
  configUrl = '/integrations',
}: PendingConfigStateProps) {
  return (
    <div
      style={{
        maxWidth: '840px',
        margin: '24px auto',
        padding: '36px 32px',
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 12px rgba(15, 23, 42, 0.03)',
        fontFamily: 'inherit',
      }}
    >
      {/* Header Tag */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px',
          borderRadius: '999px',
          background: '#fef3c7',
          color: '#92400e',
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          marginBottom: '16px',
        }}
      >
        <AlertCircle size={14} strokeWidth={2} />
        Estado: Pendiente de configuración
      </div>

      <h1
        style={{
          fontSize: '22px',
          fontWeight: 800,
          color: '#0f172a',
          letterSpacing: '-0.02em',
          margin: '0 0 8px 0',
        }}
      >
        {title}
      </h1>

      <p
        style={{
          fontSize: '14px',
          color: '#475569',
          lineHeight: '1.6',
          margin: '0 0 24px 0',
        }}
      >
        {description}
      </p>

      {/* Integration Requirement Box */}
      <div
        style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '28px',
        }}
      >
        <div
          style={{
            fontSize: '12px',
            fontWeight: 700,
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '12px',
          }}
        >
          Requisito Previo de Integración: {requiredIntegration}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {checklist.map((item, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '13px',
                color: '#334155',
              }}
            >
              <CheckCircle2 size={16} strokeWidth={1.5} style={{ color: '#94a3b8', flexShrink: 0 }} />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Link
          href={configUrl}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '6px',
            background: '#0f172a',
            color: '#ffffff',
            fontSize: '13px',
            fontWeight: 600,
            textDecoration: 'none',
            transition: 'background 0.15s ease',
          }}
        >
          <SlidersHorizontal size={16} strokeWidth={1.5} />
          Configurar Integración ({moduleName})
          <ArrowRight size={14} strokeWidth={1.5} />
        </Link>

        <Link
          href="/dashboard"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            borderRadius: '6px',
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            color: '#475569',
            fontSize: '13px',
            fontWeight: 500,
            textDecoration: 'none',
          }}
        >
          Volver al Resumen Ejecutivo
        </Link>
      </div>
    </div>
  );
}
