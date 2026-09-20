'use client';

import React, { useState } from 'react';
import { Headphones, Mail, MessageSquare, Clock, CheckCircle2 } from 'lucide-react';
import styles from '@/app/dashboard/inventario/page.module.css';

export default function SoportePage() {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState('MEDIA');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setSubject('');
      setMessage('');
    }, 4000);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Contactar Soporte Enterprise</h1>
          <p className={styles.subtitle}>
            Mesa de ayuda dedicada para incidencias técnicas, calibración de modelos de demanda o integración de ERP.
          </p>
        </div>
      </header>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>TIEMPO DE RESPUESTA SLA</span>
          <span className={styles.statValue} style={{ color: '#16a34a' }}>&lt; 15 Min</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>CANAL PRIORITARIO</span>
          <span className={styles.statValue}>Slack & Email</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>ESTADO DE PLATAFORMA</span>
          <span className={styles.statValue} style={{ color: '#16a34a' }}>100% Operativo</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>NIVEL DE SERVICIO</span>
          <span className={styles.statValue}>Soporte 24/7</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', maxWidth: '1000px' }}>
        <div className={styles.tableCard} style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '16px' }}>
            Enviar Ticket de Soporte
          </h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Asunto de la consulta</label>
              <input
                type="text"
                className={styles.input}
                style={{ width: '100%' }}
                placeholder="ej. Consulta sobre sincronización de stock con Shopify"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Nivel de Prioridad</label>
              <select
                className={styles.select}
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="BAJA">Baja (Duda general o sugerencia)</option>
                <option value="MEDIA">Media (Consulta sobre cálculo u orden)</option>
                <option value="ALTA">Alta (Error en sincronización o reporte)</option>
                <option value="URGENTE">Urgente (Quiebre inminente / Bloqueo operativo)</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Descripción detallada</label>
              <textarea
                className={styles.input}
                style={{ width: '100%', minHeight: '100px', resize: 'vertical' }}
                placeholder="Detalla lo que está sucediendo para que nuestro equipo de ingeniería te asista rápidamente..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px' }}>
              <button type="submit" className={styles.btnPrimary}>
                Enviar Ticket a Soporte
              </button>
              {submitted && (
                <span style={{ fontSize: '13px', color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle2 size={16} /> ¡Ticket recibido! Un ingeniero te responderá en breve.
                </span>
              )}
            </div>
          </form>
        </div>

        <div className={styles.tableCard} style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '16px' }}>
            Canales Directos
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '13.5px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <Mail size={18} color="#3b82f6" style={{ marginTop: '2px', flexShrink: 0 }} />
              <div>
                <strong style={{ color: '#0f172a' }}>Email de Soporte</strong>
                <div style={{ color: '#64748b', marginTop: '2px' }}>soporte@inventa.ai</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <MessageSquare size={18} color="#16a34a" style={{ marginTop: '2px', flexShrink: 0 }} />
              <div>
                <strong style={{ color: '#0f172a' }}>Canal de Slack Compartido</strong>
                <div style={{ color: '#64748b', marginTop: '2px' }}>#soporte-inventa-enterprise</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <Clock size={18} color="#f59e0b" style={{ marginTop: '2px', flexShrink: 0 }} />
              <div>
                <strong style={{ color: '#0f172a' }}>Horario de Atención Dedicado</strong>
                <div style={{ color: '#64748b', marginTop: '2px' }}>Lunes a Domingo · 24 Horas</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
