'use client';

import React, { useState, useEffect } from 'react';
import {
  Building2,
  Sliders,
  Bell,
  Save,
  CheckCircle2,
} from 'lucide-react';

export default function CompanySettingsForm() {
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Datos de la empresa
  const [companyName, setCompanyName] = useState('INVENTA COMERCIAL S.A.C.');
  const [ruc, setRuc] = useState('20601234567');
  const [address, setAddress] = useState('Av. Javier Prado Este 4200, Santiago de Surco, Lima');
  const [currency, setCurrency] = useState('PEN');

  // Parámetros de compra y ROP
  const [leadTime, setLeadTime] = useState<number>(5);
  const [sla, setSla] = useState<string>('98%');
  const [horizon, setHorizon] = useState<string>('90 días');

  // Notificaciones
  const [notifyWhatsApp, setNotifyWhatsApp] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(true);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/workspaces/settings');
        if (res.ok) {
          const data = await res.json();
          if (data.settings) {
            if (data.settings.companyName) setCompanyName(data.settings.companyName);
            if (data.settings.ruc) setRuc(data.settings.ruc);
            if (data.settings.leadTime) setLeadTime(data.settings.leadTime);
            if (data.settings.sla) setSla(data.settings.sla);
            if (data.settings.currency) setCurrency(data.settings.currency);
          }
        }
      } catch (err) {
        console.error('Error cargando configuración:', err);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch('/api/workspaces/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          ruc,
          address,
          currency,
          leadTime,
          sla,
          horizon,
          notifyWhatsApp,
          notifyEmail,
        }),
      });
    } catch (err) {
      console.error('Error guardando configuración:', err);
    } finally {
      setSaving(false);
      setSuccessMessage('Configuración general guardada exitosamente.');
      setTimeout(() => setSuccessMessage(null), 3500);
    }
  };

  return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Notificación de Éxito */}
        {successMessage && (
          <div
            style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              color: '#166534',
              padding: '12px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <CheckCircle2 size={16} color="#16a34a" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* SECCIÓN 1: DATOS CORPORATIVOS */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <Building2 size={20} color="#2563eb" />
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Información del Workspace & Empresa
              </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Razón Social / Empresa
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  RUC / Identificación Fiscal
                </label>
                <input
                  type="text"
                  value={ruc}
                  onChange={(e) => setRuc(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  required
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Dirección Fiscal
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Moneda Principal
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    background: '#ffffff',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="PEN">PEN — Sol Peruano (S/.)</option>
                  <option value="USD">USD — Dólar Estadounidense ($)</option>
                </select>
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: PARÁMETROS DEL ALGORITMO */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <Sliders size={20} color="#2563eb" />
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Parámetros del Cerebro de Compras (ROP)
              </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Lead Time Promedio
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={leadTime}
                    onChange={(e) => setLeadTime(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                    required
                  />
                  <span style={{ position: 'absolute', right: '12px', top: '9px', fontSize: '13px', color: '#64748b' }}>
                    días
                  </span>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Nivel de Servicio (SLA)
                </label>
                <select
                  value={sla}
                  onChange={(e) => setSla(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    background: '#ffffff',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="90%">90% — Cobertura Básica</option>
                  <option value="95%">95% — Estándar Operativo</option>
                  <option value="98%">98% — Alta Disponibilidad (Recomendado)</option>
                  <option value="99%">99% — Cero Quiebre Crítico</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Horizonte de Predicción
                </label>
                <select
                  value={horizon}
                  onChange={(e) => setHorizon(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    background: '#ffffff',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="30 días">30 días</option>
                  <option value="60 días">60 días</option>
                  <option value="90 días">90 días (Óptimo Enterprise)</option>
                </select>
              </div>
            </div>
          </div>

          {/* SECCIÓN 3: NOTIFICACIONES AUTOMATIZADAS */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <Bell size={20} color="#2563eb" />
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Canales de Notificación
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#334155', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={notifyWhatsApp}
                  onChange={(e) => setNotifyWhatsApp(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#2563eb' }}
                />
                <span>Enviar alertas urgentes de riesgo de quiebre a través de WhatsApp B2B</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#334155', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#2563eb' }}
                />
                <span>Enviar resumen ejecutivo de compras sugeridas al correo cada lunes</span>
              </label>
            </div>
          </div>

          {/* Botón de Guardado */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: '#2563eb',
                color: '#ffffff',
                padding: '11px 24px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              }}
            >
              <Save size={16} />
              <span>{saving ? 'Guardando configuración...' : 'Guardar Configuración General'}</span>
            </button>
          </div>
        </form>
      </div>
  );
}
