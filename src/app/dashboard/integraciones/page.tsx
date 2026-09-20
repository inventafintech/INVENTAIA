'use client';

import { useState } from 'react';
import styles from './page.module.css';

interface Integration {
  id: string;
  name: string;
  category: string;
  desc: string;
  lastSync: string;
  status: 'connected' | 'syncing';
}

const initialIntegrations: Integration[] = [
  {
    id: '1',
    name: 'Shopify Plus',
    category: 'E-commerce B2B',
    desc: 'Sincronización de pedidos en tiempo real, inventario multialmacén y precios por volumen.',
    lastSync: 'Hace 1 minuto',
    status: 'connected',
  },
  {
    id: '2',
    name: 'Amazon Business',
    category: 'Marketplace',
    desc: 'Integración de órdenes FBA y cumplimiento multicanal con actualización de stock cada 5m.',
    lastSync: 'Hace 3 minutos',
    status: 'connected',
  },
  {
    id: '3',
    name: 'SAP S/4HANA',
    category: 'ERP Empresarial',
    desc: 'Conciliación de módulos MM (Material Management) y SD (Sales & Distribution) vía RFC/REST.',
    lastSync: 'Hace 8 minutos',
    status: 'connected',
  },
  {
    id: '4',
    name: 'Mercado Libre',
    category: 'Marketplace',
    desc: 'Monitoreo de publicaciones Full y actualización automática de stock de seguridad.',
    lastSync: 'Hace 12 minutos',
    status: 'connected',
  },
  {
    id: '5',
    name: 'SUNAT Facturación',
    category: 'Fiscal / OSE',
    desc: 'Emisión automática de Guías de Remisión Electrónicas (GRE) y Facturas comerciales.',
    lastSync: 'Hace 2 minutos',
    status: 'connected',
  },
  {
    id: '6',
    name: 'WhatsApp Business API',
    category: 'Notificaciones',
    desc: 'Alertas inmediatas a Jefes de Almacén y Compradores cuando un SKU entra en estado crítico.',
    lastSync: 'En tiempo real',
    status: 'connected',
  },
];

export default function IntegracionesPage() {
  const [integrations, setIntegrations] = useState(initialIntegrations);

  const handleSync = (name: string) => {
    alert(`Sincronización manual forzada para ${name}. Descargando últimos eventos...`);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Integraciones & Conectores ERP</h1>
          <p className={styles.subtitle}>
            Conexión bidireccional nativa con tus canales de venta, logística y sistemas fiscales.
          </p>
        </div>
        <button className={styles.btnPrimary} onClick={() => alert('Abrir asistente de nueva integración')}>
          + Conectar Nueva App
        </button>
      </header>

      <div className={styles.grid}>
        {integrations.map((app) => (
          <div key={app.id} className={styles.card}>
            <div className={styles.cardTop}>
              <div className={styles.logoRow}>
                <span className={styles.appName}>{app.name}</span>
                <span className={styles.badgeConnected}>
                  <span className={styles.badgeDot}></span>
                  Activo
                </span>
              </div>
              <p className={styles.appDesc}>{app.desc}</p>
              <div className={styles.syncInfo}>
                Última sincronización: <strong>{app.lastSync}</strong>
              </div>
            </div>

            <div className={styles.cardActions}>
              <button className={styles.btnAction} onClick={() => handleSync(app.name)}>
                Sincronizar
              </button>
              <button className={styles.btnAction} onClick={() => alert(`Configuración de credenciales de ${app.name}`)}>
                Ajustes
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
