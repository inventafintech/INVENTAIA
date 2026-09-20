'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkspaceStore } from '@/hooks/useWorkspaceStore';
import styles from './page.module.css';

export default function AjustesPage() {
  const router = useRouter();
  const { workspaceName, setWorkspaceName } = useWorkspaceStore();

  const [companyName, setCompanyName] = useState(workspaceName);
  const [ruc, setRuc] = useState('20601234567');
  const [leadTime, setLeadTime] = useState(5);
  const [sla, setSla] = useState('95');
  const [currency, setCurrency] = useState('PEN');
  const [horizon, setHorizon] = useState('30');
  const [notifyWhatsApp, setNotifyWhatsApp] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(true);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sincronizar campos al montar o si el workspaceName cambia
  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/dashboard/ajustes', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data.settings) {
            setCompanyName(data.settings.companyName);
            setWorkspaceName(data.settings.companyName);
            if (data.settings.ruc) setRuc(data.settings.ruc);
            if (data.settings.leadTime) setLeadTime(data.settings.leadTime);
            if (data.settings.sla) setSla(data.settings.sla);
            if (data.settings.currency) setCurrency(data.settings.currency);
            if (data.settings.horizon) setHorizon(data.settings.horizon);
            if (typeof data.settings.notifyWhatsApp === 'boolean') setNotifyWhatsApp(data.settings.notifyWhatsApp);
            if (typeof data.settings.notifyEmail === 'boolean') setNotifyEmail(data.settings.notifyEmail);
          }
        }
      } catch (err) {
        console.error('Error al cargar configuración:', err);
      }
    }
    loadSettings();
  }, [setWorkspaceName]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setErrorMessage(null);

    const trimmedName = companyName.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setErrorMessage('La Razón Social debe tener al menos 2 caracteres.');
      setSaving(false);
      return;
    }

    try {
      // 1. Ejecutar llamada a la API real para guardar en base de datos
      const res = await fetch('/api/dashboard/ajustes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: trimmedName,
          ruc,
          leadTime,
          sla,
          currency,
          horizon,
          notifyWhatsApp,
          notifyEmail,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // 2. Actualizar inmediatamente el estado global reactivo (Sidebar se actualiza al instante)
        setWorkspaceName(trimmedName);
        setSaved(true);

        // 3. Invalidar caché del servidor Next.js
        router.refresh();

        setTimeout(() => setSaved(false), 3500);
      } else {
        setErrorMessage(data.error || 'No se pudo guardar la configuración.');
      }
    } catch (err: any) {
      setErrorMessage(`Error de red: ${err.message || 'Inténtalo de nuevo.'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Configuración & Parámetros Operativos</h1>
        <p className={styles.subtitle}>
          Ajusta las políticas de inventario, márgenes de seguridad y datos fiscales de tu empresa.
        </p>
      </header>

      {errorMessage && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#b91c1c',
          padding: '12px 16px',
          borderRadius: '8px',
          fontSize: '13px',
          lineHeight: '1.4',
        }}>
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSave} className={styles.card}>
        <h2 className={styles.sectionTitle}>1. Datos de la Empresa</h2>
        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Razón Social</label>
            <input 
              type="text" 
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className={styles.input} 
              placeholder="Nombre comercial o Razón Social"
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>RUC / Identificación Fiscal</label>
            <input 
              type="text" 
              value={ruc}
              onChange={(e) => setRuc(e.target.value)}
              className={styles.input} 
              placeholder="ej. 20601234567"
            />
          </div>
        </div>

        <h2 className={styles.sectionTitle} style={{ marginTop: '16px' }}>2. Reglas del Algoritmo de Reposición</h2>
        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Lead Time General por Defecto</label>
            <input 
              type="number" 
              value={leadTime}
              onChange={(e) => setLeadTime(Number(e.target.value))}
              className={styles.input} 
              min={1}
              max={180}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Nivel de Servicio Deseado (SLA)</label>
            <select 
              className={styles.select} 
              value={sla}
              onChange={(e) => setSla(e.target.value)}
            >
              <option value="90">90% (Menor stock de seguridad)</option>
              <option value="95">95% (Recomendado para consumo masivo)</option>
              <option value="98">98% (Alta exigencia)</option>
              <option value="99">99% (Cero quiebres / Stock crítico)</option>
            </select>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Moneda Principal</label>
            <select 
              className={styles.select} 
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              <option value="PEN">PEN (Soles - S/)</option>
              <option value="USD">USD (Dólares - $)</option>
            </select>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Horizonte de Proyección por Defecto</label>
            <select 
              className={styles.select} 
              value={horizon}
              onChange={(e) => setHorizon(e.target.value)}
            >
              <option value="30">30 días</option>
              <option value="60">60 días</option>
              <option value="90">90 días</option>
              <option value="180">180 días</option>
            </select>
          </div>
        </div>

        <h2 className={styles.sectionTitle} style={{ marginTop: '16px' }}>3. Canales de Notificación Crítica</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label className={styles.checkboxRow}>
            <input 
              type="checkbox" 
              checked={notifyWhatsApp}
              onChange={(e) => setNotifyWhatsApp(e.target.checked)}
            />
            Enviar alertas de quiebre inminente (&lt;3 días) por WhatsApp al Administrador de Compras.
          </label>
          <label className={styles.checkboxRow}>
            <input 
              type="checkbox" 
              checked={notifyEmail}
              onChange={(e) => setNotifyEmail(e.target.checked)}
            />
            Enviar resumen semanal de capital inmovilizado al correo del CFO.
          </label>
        </div>

        <button 
          type="submit" 
          className={styles.btnPrimary}
          disabled={saving}
        >
          {saving ? 'Guardando en base de datos...' : saved ? '✓ Cambios Guardados' : 'Guardar Configuración'}
        </button>
      </form>
    </div>
  );
}
