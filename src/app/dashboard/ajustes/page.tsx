'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkspaceStore, WorkspaceSettings } from '@/hooks/useWorkspaceStore';
import styles from './page.module.css';

export default function AjustesPage() {
  const router = useRouter();
  const { settings, updateWorkspaceSettings } = useWorkspaceStore();

  // Estado local unificado y controlado para el formulario
  const [formData, setFormData] = useState<WorkspaceSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sincronizar datos iniciales desde el backend real al montar el componente
  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/dashboard/ajustes', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data.settings) {
            const currentStore = useWorkspaceStore.getState().settings;

            const serverSettings: WorkspaceSettings = {
              razonSocial: data.settings.razonSocial || data.settings.companyName || currentStore.razonSocial || '',
              ruc: data.settings.ruc || currentStore.ruc || '',
              leadTime: Number(data.settings.leadTime) || currentStore.leadTime || 5,
              sla: String(data.settings.sla || currentStore.sla || '95'),
              moneda: data.settings.moneda || data.settings.currency || currentStore.moneda || 'PEN',
              horizonteProyeccion: String(data.settings.horizonteProyeccion || data.settings.horizon || currentStore.horizonteProyeccion || '30'),
              alertasWhatsapp: typeof data.settings.alertasWhatsapp === 'boolean'
                ? data.settings.alertasWhatsapp
                : (currentStore.alertasWhatsapp ?? true),
              resumenCorreo: typeof data.settings.resumenCorreo === 'boolean'
                ? data.settings.resumenCorreo
                : (currentStore.resumenCorreo ?? true),
            };

            setFormData(serverSettings);
            updateWorkspaceSettings(serverSettings);
          }
        }
      } catch (err) {
        console.error('Error al cargar la configuración del workspace:', err);
      }
    }
    loadSettings();
  }, [updateWorkspaceSettings]);

  // Manejador genérico para inputs de texto, selects y checkboxes
  const handleChange = (field: keyof WorkspaceSettings, value: string | number | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Envío transaccional y sincronización global
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setErrorMessage(null);

    const trimmedName = formData.razonSocial.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setErrorMessage('La Razón Social debe tener al menos 2 caracteres.');
      setSaving(false);
      return;
    }

    // 1. Agrupar todos los estados locales en un único payload JSON
    const payload: WorkspaceSettings = {
      razonSocial: trimmedName,
      ruc: formData.ruc.trim(),
      leadTime: Number(formData.leadTime),
      sla: formData.sla,
      moneda: formData.moneda,
      horizonteProyeccion: formData.horizonteProyeccion,
      alertasWhatsapp: Boolean(formData.alertasWhatsapp),
      resumenCorreo: Boolean(formData.resumenCorreo),
    };

    try {
      // 2. Realizar un único llamado PUT a la API real
      const res = await fetch('/api/dashboard/ajustes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // 3. Inyectar inmediatamente en el estado global reactivo
        updateWorkspaceSettings(payload);
        setSaved(true);

        // 4. Invalidar caché del servidor para que todos los Server Components se refresquen
        router.refresh();

        setTimeout(() => setSaved(false), 3500);
      } else {
        setErrorMessage(data.error || 'No se pudo guardar la configuración en la base de datos.');
      }
    } catch (err: any) {
      setErrorMessage(`Error de red al guardar: ${err.message || 'Inténtalo de nuevo.'}`);
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
          border: '1px solid var(--color-alarm-red)',
          color: '#b91c1c',
          padding: '12px 16px',
          borderRadius: '10px',
          fontSize: '13px',
          lineHeight: '1.4',
        }}>
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.card}>
        {/* SECCIÓN 1: Datos de la Empresa */}
        <h2 className={styles.sectionTitle}>1. Datos de la Empresa</h2>
        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Razón Social</label>
            <input 
              type="text" 
              value={formData.razonSocial}
              onChange={(e) => handleChange('razonSocial', e.target.value)}
              className={styles.input} 
              placeholder="Nombre comercial o Razón Social"
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>RUC / Identificación Fiscal</label>
            <input 
              type="text" 
              value={formData.ruc}
              onChange={(e) => handleChange('ruc', e.target.value)}
              className={styles.input} 
              placeholder="20XXXXXXXXX"
            />
          </div>
        </div>

        {/* SECCIÓN 2: Reglas del Algoritmo de Reposición */}
        <h2 className={styles.sectionTitle} style={{ marginTop: '16px' }}>2. Reglas del Algoritmo de Reposición</h2>
        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Lead Time General por Defecto (Días)</label>
            <input 
              type="number" 
              value={formData.leadTime}
              onChange={(e) => handleChange('leadTime', Number(e.target.value))}
              className={styles.input} 
              min={1}
              max={180}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Nivel de Servicio Deseado (SLA)</label>
            <select 
              className={styles.select} 
              value={formData.sla}
              onChange={(e) => handleChange('sla', e.target.value)}
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
              value={formData.moneda}
              onChange={(e) => handleChange('moneda', e.target.value)}
            >
              <option value="PEN">PEN (Soles - S/)</option>
              <option value="USD">USD (Dólares - $)</option>
            </select>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Horizonte de Proyección por Defecto</label>
            <select 
              className={styles.select} 
              value={formData.horizonteProyeccion}
              onChange={(e) => handleChange('horizonteProyeccion', e.target.value)}
            >
              <option value="30">30 días</option>
              <option value="60">60 días</option>
              <option value="90">90 días</option>
              <option value="180">180 días</option>
            </select>
          </div>
        </div>

        {/* SECCIÓN 3: Canales de Notificación Crítica */}
        <h2 className={styles.sectionTitle} style={{ marginTop: '16px' }}>3. Canales de Notificación Crítica</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label className={styles.checkboxRow}>
            <input 
              type="checkbox" 
              checked={formData.alertasWhatsapp}
              onChange={(e) => handleChange('alertasWhatsapp', e.target.checked)}
            />
            Enviar alertas de quiebre inminente (&lt;3 días) por WhatsApp al Administrador de Compras.
          </label>
          <label className={styles.checkboxRow}>
            <input 
              type="checkbox" 
              checked={formData.resumenCorreo}
              onChange={(e) => handleChange('resumenCorreo', e.target.checked)}
            />
            Enviar resumen semanal de capital inmovilizado al correo del CFO.
          </label>
        </div>

        <button 
          type="submit" 
          className={styles.btnPrimary}
          disabled={saving}
        >
          {saving ? 'Guardando en base de datos...' : saved ? '✓ Configuración Guardada' : 'Guardar Configuración'}
        </button>
      </form>
    </div>
  );
}
