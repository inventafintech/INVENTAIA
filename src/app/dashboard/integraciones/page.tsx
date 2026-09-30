'use client';

import { useState, useEffect, useCallback } from 'react';
import styles from './page.module.css';

import { apiFetch } from '@/lib/apiFetch';
interface IntegrationData {
  id: string;
  provider: string;
  status: 'pending_configuration' | 'configured' | 'active' | 'error';
  config: Record<string, any>;
  created_at: string;
  updated_at: string;
  has_token?: boolean;
  shop_domain?: string;
}

interface LogEntry {
  id: string;
  fecha: string;
  usuario: string;
  integracion: string;
  nivel: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';
  accion: string;
  resultado: string;
  errores?: string | null;
  ip?: string;
}

interface ConnectorDef {
  id: string;
  name: string;
  category: string;
  group: 'Marketplaces' | 'E-commerce' | 'ERP Empresarial' | 'Comunicaciones' | 'Fiscal';
  brandLetter: string;
  brandColor: string;
  desc: string;
  oauthSupported: boolean;
  syncEndpoint: string;
  defaultEndpoint: string;
  authType: string;
}

const CONNECTOR_GROUPS = ['Marketplaces', 'E-commerce', 'ERP Empresarial', 'Comunicaciones', 'Fiscal'] as const;

const CREDENTIAL_FIELDS: Record<string, Array<{ key: string; label: string; placeholder: string; secret?: boolean }>> = {
  whatsapp: [
    { key: 'access_token', label: 'Token de acceso (Meta System User)', placeholder: 'EAAB...', secret: true },
    { key: 'phone_number_id', label: 'Phone Number ID', placeholder: '123456789012345' },
  ],
  sap: [
    { key: 'baseUrl', label: 'URL base OData (SAP_HOST)', placeholder: 'https://sap.midominio.com:44300' },
  ],
  woocommerce: [
    { key: 'storeUrl', label: 'URL de la tienda', placeholder: 'https://mitienda.com' },
    { key: 'consumerKey', label: 'Consumer Key', placeholder: 'ck_...' },
    { key: 'consumerSecret', label: 'Consumer Secret', placeholder: 'cs_...', secret: true },
  ],
};

const CONNECTOR_DEFINITIONS: ConnectorDef[] = [
  {
    id: 'shopify',
    name: 'Shopify Plus',
    category: 'E-commerce B2B',
    group: 'E-commerce',
    brandLetter: 'S',
    brandColor: '#16a34a',
    desc: 'OAuth 2.0 real con Shopify Admin API (/products.json, /orders.json, /inventory_levels.json). Persistencia directa en base de datos.',
    oauthSupported: true,
    syncEndpoint: '/api/integraciones/shopify/sync',
    defaultEndpoint: 'https://{shop}.myshopify.com/admin/api/2026-04',
    authType: 'OAuth 2.0 Admin Access Token'
  },
  {
    id: 'mercadolibre',
    name: 'Mercado Libre',
    category: 'Marketplace Oficial',
    group: 'Marketplaces',
    brandLetter: 'M',
    brandColor: 'var(--color-forest-ink)',
    desc: 'OAuth 2.0 oficial de Mercado Libre. Sincronización de publicaciones (/users/me/items/search), ventas (/orders/search) y stock.',
    oauthSupported: true,
    syncEndpoint: '/api/integraciones/mercadolibre/sync',
    defaultEndpoint: 'https://api.mercadolibre.com',
    authType: 'OAuth 2.0 Bearer Token'
  },
  {
    id: 'woocommerce',
    name: 'WooCommerce',
    category: 'E-commerce WC REST',
    group: 'E-commerce',
    brandLetter: 'W',
    brandColor: '#7e22ce',
    desc: 'WooCommerce REST API v3 con Consumer Key/Secret. Sincronización de catálogo (/products) y stock real a Supabase.',
    oauthSupported: false,
    syncEndpoint: '/api/integraciones/woocommerce/sync',
    defaultEndpoint: 'https://mitienda.com/wp-json/wc/v3',
    authType: 'Consumer Key + Secret (Basic)'
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Business API',
    category: 'Meta Cloud API',
    group: 'Comunicaciones',
    brandLetter: 'W',
    brandColor: '#059669',
    desc: 'Meta WhatsApp Cloud API oficial (v19.0) para envío de notificaciones y alertas operacionales a almacenes y compradores.',
    oauthSupported: false,
    syncEndpoint: '/api/integraciones/whatsapp/send',
    defaultEndpoint: 'https://graph.facebook.com/v19.0/{PHONE_NUMBER_ID}/messages',
    authType: 'Meta Permanent System User Token'
  },
  {
    id: 'sap',
    name: 'SAP S/4HANA',
    category: 'ERP Empresarial OData',
    group: 'ERP Empresarial',
    brandLetter: 'S',
    brandColor: '#1d4ed8',
    desc: 'Conectores REST/OData v4 para sincronización de Catálogo de Productos (API_PRODUCT_SRV) y Socios Comerciales (API_BUSINESS_PARTNER).',
    oauthSupported: false,
    syncEndpoint: '/api/integraciones/sap/sync',
    defaultEndpoint: 'https://{SAP_HOST}/sap/opu/odata/sap/API_PRODUCT_SRV',
    authType: 'Basic Auth / SAP API Key'
  },
  {
    id: 'amazon',
    name: 'Amazon Business',
    category: 'Marketplace SP-API',
    group: 'Marketplaces',
    brandLetter: 'a',
    brandColor: '#f59e0b',
    desc: 'Conexión Selling Partner API para conciliación de reportes de inventario FBA y órdenes multicanal.',
    oauthSupported: false,
    syncEndpoint: '/api/integraciones/amazon/sync',
    defaultEndpoint: 'https://sellingpartnerapi-na.amazon.com',
    authType: 'LWA OAuth 2.0 (SP-API)'
  },
  {
    id: 'sunat',
    name: 'SUNAT Facturación & GRE',
    category: 'Fiscal / OSE',
    group: 'Fiscal',
    brandLetter: 'S',
    brandColor: 'var(--color-alarm-red)',
    desc: 'Conexión Web Services SUNAT para emisión de Guías de Remisión Electrónicas (GRE) y Facturación Comercial.',
    oauthSupported: false,
    syncEndpoint: '/api/integraciones/sunat/sync',
    defaultEndpoint: 'https://e-factura.sunat.gob.pe/ol-ti-itcpfegem/billService',
    authType: 'Clave SOL + Certificado Digital X.509'
  }
];

export default function IntegracionesPage() {
  const [activeTab, setActiveTab] = useState<'conectores' | 'alertas' | 'logs' | 'auditoria'>('conectores');
  const [integrations, setIntegrations] = useState<Record<string, IntegrationData>>({});
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [, setLoading] = useState(true);

  // Sync state per connector: status and message
  const [syncState, setSyncState] = useState<Record<string, { loading: boolean; error?: string; success?: string }>>({});

  // Drawer state
  const [selectedConnector, setSelectedConnector] = useState<ConnectorDef | null>(null);
  const [drawerTab, setDrawerTab] = useState<'credenciales' | 'sincronizacion' | 'webhooks'>('credenciales');
  const [configForm, setConfigForm] = useState<Record<string, any>>({});
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // OAuth Modal state
  const [shopifyShopDomain, setShopifyShopDomain] = useState('');
  const [showShopifyModal, setShowShopifyModal] = useState(false);

  // WhatsApp send test state
  const [waTo, setWaTo] = useState('+51');
  const [waMessage, setWaMessage] = useState('ALERTA INVENTA.AI: Quiebre inminente en SKU-ALI-001 (1.9 días de stock restante).');
  const [waSending, setWaSending] = useState(false);
  const [waResult, setWaResult] = useState<{ success: boolean; text: string } | null>(null);

  // Filters for logs
  const [logFilter, setLogFilter] = useState<'ALL' | 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS'>('ALL');
  const [logSearch, setLogSearch] = useState('');

  // Stats reales (sincronizaciones hoy + última actualización)
  const [stats, setStats] = useState<{ syncsToday: number; lastSyncAt: string | null }>({ syncsToday: 0, lastSyncAt: null });

  // Modal de credenciales manuales (WhatsApp / SAP / WooCommerce)
  const [credProvider, setCredProvider] = useState<string | null>(null);
  const [credValues, setCredValues] = useState<Record<string, string>>({});
  const [credLoading, setCredLoading] = useState(false);
  const [credError, setCredError] = useState<string | null>(null);
  const [credOk, setCredOk] = useState<string | null>(null);

  // Confirmación de desconexión (two-step)
  const [disconnectConfirm, setDisconnectConfirm] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  // 1. Fetch real integrations and logs
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [resInt, resLogs, resStats] = await Promise.all([
        apiFetch('/api/integraciones', { cache: 'no-store' }),
        apiFetch('/api/integraciones/logs', { cache: 'no-store' }),
        apiFetch('/api/integraciones/stats', { cache: 'no-store' })
      ]);

      if (resInt.ok) {
        const data = await resInt.json();
        const map: Record<string, IntegrationData> = {};
        (data.integrations || []).forEach((item: IntegrationData) => {
          map[item.provider] = item;
        });
        setIntegrations(map);
      }

      if (resLogs.ok) {
        const logsData = await resLogs.json();
        setLogs(logsData.logs || []);
      }

      if (resStats.ok) {
        const statsData = await resStats.json();
        setStats({ syncsToday: statsData.syncsToday || 0, lastSyncAt: statsData.lastSyncAt || null });
      }
    } catch (err) {
      console.error('Error fetching integration data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 2. Real Sync Trigger
  const handleSync = async (connector: ConnectorDef) => {
    setSyncState(prev => ({
      ...prev,
      [connector.id]: { loading: true, error: undefined, success: undefined }
    }));

    try {
      let res: Response;
      if (connector.id === 'whatsapp') {
        res = await apiFetch('/api/integraciones/whatsapp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: waTo || '+51987654321',
            message: 'Prueba de sincronización y conectividad de WhatsApp Cloud API.'
          })
        });
      } else {
        res = await fetch(connector.syncEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ connector_id: connector.id })
        });
      }

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const errorMsg = data.message || data.error || `Error HTTP ${res.status}`;
        setSyncState(prev => ({
          ...prev,
          [connector.id]: { loading: false, error: errorMsg }
        }));
      } else {
        const successMsg = data.message || 
          (data.products_synced !== undefined ? `✓ Sincronizado: ${data.products_synced} productos, ${data.orders_synced || 0} órdenes.` : '✓ Conexión y sincronización completada exitosamente.');
        
        setSyncState(prev => ({
          ...prev,
          [connector.id]: { loading: false, success: successMsg }
        }));
      }

      // Re-fetch data and logs to show real database update
      await loadData();
    } catch (err: any) {
      setSyncState(prev => ({
        ...prev,
        [connector.id]: { loading: false, error: err.message || 'Error de red al sincronizar' }
      }));
      await loadData();
    }
  };

  // 3. Real WhatsApp Message Send
  const handleSendWhatsApp = async () => {
    setWaSending(true);
    setWaResult(null);

    try {
      const res = await apiFetch('/api/integraciones/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: waTo,
          message: waMessage
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setWaResult({
          success: false,
          text: data.error || `Error HTTP ${res.status}: Fallo al enviar mensaje.`
        });
      } else {
        setWaResult({
          success: true,
          text: `✓ Mensaje enviado exitosamente vía Meta Cloud API. ID: ${data.message_id || 'OK'}`
        });
      }
      await loadData();
    } catch (err: any) {
      setWaResult({
        success: false,
        text: `Error de red: ${err.message}`
      });
    } finally {
      setWaSending(false);
    }
  };

  // 4. Save Connector Configuration in Database
  const handleSaveConfig = async () => {
    if (!selectedConnector) return;
    setSaveStatus('Guardando...');

    try {
      const res = await apiFetch('/api/integraciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedConnector.id,
          config: configForm
        })
      });

      const data = await res.json();
      if (res.ok) {
        setSaveStatus('✓ Configuración guardada en base de datos.');
        await loadData();
        setTimeout(() => {
          setSelectedConnector(null);
          setSaveStatus(null);
        }, 1200);
      } else {
        setSaveStatus(`Error: ${data.error || 'No se pudo guardar'}`);
      }
    } catch (err: any) {
      setSaveStatus(`Error: ${err.message}`);
    }
  };

  // 4b. Revocar acceso de forma segura (two-step, con limpieza real)
  const handleDisconnect = async (connectorId: string) => {
    if (disconnectConfirm !== connectorId) {
      setDisconnectConfirm(connectorId);
      return;
    }
    setDisconnectConfirm(null);
    setDisconnecting(true);
    try {
      const res = await apiFetch(`/api/integraciones/${encodeURIComponent(connectorId)}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'No se pudo desconectar.');
      setSyncState(prev => ({
        ...prev,
        [connectorId]: { loading: false, success: '✓ Acceso revocado. Tokens y configuración eliminados.' }
      }));
      await loadData();
    } catch (err: any) {
      setSyncState(prev => ({
        ...prev,
        [connectorId]: { loading: false, error: err.message || 'Error al desconectar' }
      }));
    } finally {
      setDisconnecting(false);
    }
  };

  // 4c. Guardar credenciales manuales con verificación viva
  const openCredModal = (provider: string) => {
    setCredProvider(provider);
    setCredValues({});
    setCredError(null);
    setCredOk(null);
  };

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!credProvider) return;
    const fields = CREDENTIAL_FIELDS[credProvider] || [];
    for (const f of fields) {
      if (!credValues[f.key]?.trim()) {
        setCredError(`Falta el campo obligatorio: ${f.label}.`);
        return;
      }
    }
    setCredLoading(true);
    setCredError(null);
    setCredOk(null);
    try {
      const res = await apiFetch('/api/integraciones/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: credProvider, credentials: credValues })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'No se pudo guardar.');
      setCredOk(data?.message || 'Conectado y verificado.');
      await loadData();
      setTimeout(() => {
        setCredProvider(null);
        setCredOk(null);
      }, 1400);
    } catch (err: any) {
      setCredError(err?.message || 'No se pudo guardar.');
    } finally {
      setCredLoading(false);
    }
  };

  // Start Shopify OAuth
  const handleStartShopifyOAuth = () => {
    if (!shopifyShopDomain.trim()) {
      alert('Por favor ingrese el dominio de su tienda Shopify (ej: mi-tienda.myshopify.com)');
      return;
    }
    const cleanDomain = shopifyShopDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    window.location.href = `/api/integraciones/shopify/auth?shop=${encodeURIComponent(cleanDomain)}`;
  };

  // Start Mercado Libre OAuth
  const handleStartMercadoLibreOAuth = () => {
    window.location.href = '/api/integraciones/mercadolibre/auth';
  };

  // Status badge computation
  const renderStatusBadge = (connector: ConnectorDef) => {
    const data = integrations[connector.id];
    const isSyncing = syncState[connector.id]?.loading;

    if (isSyncing) {
      return (
        <span className={styles.badgeSyncing}>
          <span className={styles.badgeDotPulse}></span>
          Sincronizando...
        </span>
      );
    }

    if (connector.id === 'sap') {
      if (!data || data.status === 'pending_configuration') {
        return (
          <span className={styles.badgeSapUnconfigured}>
            <span className={styles.badgeDotPending}></span>
            Conector disponible. Instancia SAP no configurada.
          </span>
        );
      }
    }

    if (!data || data.status === 'pending_configuration') {
      return (
        <span className={styles.badgePending}>
          <span className={styles.badgeDotPending}></span>
          Pendiente de configuración
        </span>
      );
    }

    if (data.status === 'configured' || data.status === 'active') {
      return (
        <span className={styles.badgeConnected}>
          <span className={styles.badgeDot}></span>
          Configurado
        </span>
      );
    }

    return (
      <span className={styles.badgeError}>
        <span className={styles.badgeDotError}></span>
        Error de Conexión
      </span>
    );
  };

  // Count active/configured integrations
  const activeCount = Object.values(integrations).filter(
    i => i.status === 'configured' || i.status === 'active'
  ).length;

  const pendingCount = CONNECTOR_DEFINITIONS.length - activeCount;

  const filteredLogs = logs.filter(l => {
    const matchesLevel = logFilter === 'ALL' || l.nivel === logFilter;
    const matchesSearch = 
      (l.accion || '').toLowerCase().includes(logSearch.toLowerCase()) || 
      (l.integracion || '').toLowerCase().includes(logSearch.toLowerCase()) ||
      (l.resultado || '').toLowerCase().includes(logSearch.toLowerCase()) ||
      (l.errores || '').toLowerCase().includes(logSearch.toLowerCase());
    return matchesLevel && matchesSearch;
  });

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Integraciones & Conectores ERP</h1>
          <p className={styles.subtitle}>
            Hub operacional de integraciones reales con APIs oficiales, persistencia en base de datos y auditoría de sincronización.
          </p>
        </div>
      </header>

      {/* 1. Header KPIs Monitor (REAL DATA ONLY) */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Integraciones Activas</span>
          <span className={styles.kpiValue}>{activeCount} / {CONNECTOR_DEFINITIONS.length}</span>
          <span className={`${styles.kpiStatus} ${activeCount > 0 ? styles.statusGreen : styles.statusBlue}`}>
            {activeCount === 0 ? '● Pendientes de configuración' : `● ${activeCount} Conectada(s)`}
          </span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Pendientes de Configuración</span>
          <span className={styles.kpiValue}>{pendingCount}</span>
          <span className={`${styles.kpiStatus} ${styles.statusBlue}`}>Credenciales requeridas</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Última Sincronización</span>
          <span className={styles.kpiValue} style={{ fontSize: '15px', marginTop: '4px' }}>
            {stats.lastSyncAt ? new Date(stats.lastSyncAt).toLocaleTimeString() : (logs.length > 0 ? new Date(logs[0].fecha).toLocaleTimeString() : 'Sin registros')}
          </span>
          <span className={`${styles.kpiStatus} ${styles.statusBlue}`}>
            {stats.lastSyncAt ? new Date(stats.lastSyncAt).toLocaleDateString() : (logs.length > 0 ? new Date(logs[0].fecha).toLocaleDateString() : 'A la espera de ejecución')}
          </span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Sincronizaciones Hoy</span>
          <span className={styles.kpiValue}>{stats.syncsToday}</span>
          <span className={`${styles.kpiStatus} ${styles.statusGreen}`}>Eventos de integración hoy</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Logs de Auditoría</span>
          <span className={styles.kpiValue}>{logs.length}</span>
          <span className={`${styles.kpiStatus} ${styles.statusGreen}`}>Persistidos en BD</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Modo de Operación</span>
          <span className={styles.kpiValue} style={{ fontSize: '16px', color: '#059669' }}>API Real</span>
          <span className={`${styles.kpiStatus} ${styles.statusGreen}`}>Cero mocks · Enterprise</span>
        </div>
      </div>

      {/* 2. Tabs Navigation */}
      <div className={styles.tabsNav}>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'conectores' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('conectores')}
        >
          Conectores Oficiales
          <span className={styles.tabBadge}>{CONNECTOR_DEFINITIONS.length}</span>
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'alertas' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('alertas')}
        >
          Monitor de Estado
          <span className={styles.tabBadgeAlert}>{pendingCount}</span>
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'logs' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          Live Event Logs
          <span className={styles.tabBadge}>{logs.length}</span>
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'auditoria' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('auditoria')}
        >
          Registro de Auditoría
          <span className={styles.tabBadge}>{logs.length}</span>
        </button>
      </div>

      {/* TAB 1: CONECTORES (agrupados por categoría) */}
      {activeTab === 'conectores' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          {CONNECTOR_GROUPS.map((group) => {
            const groupConnectors = CONNECTOR_DEFINITIONS.filter((c) => c.group === group);
            if (groupConnectors.length === 0) return null;
            return (
              <section key={group} aria-label={`Categoría ${group}`}>
                <h2 style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.06em', color: 'var(--ink)', opacity: 0.75, margin: '0 0 10px 2px', textTransform: 'uppercase' }}>
                  {group}
                </h2>
                <div className={styles.grid}>
                  {groupConnectors.map((connector) => {
            const intData = integrations[connector.id];
            const isActive = intData?.status === 'configured' || intData?.status === 'active';
            const syncInfo = syncState[connector.id];

            return (
              <div key={connector.id} className={styles.card}>
                <div className={styles.cardTop}>
                  <div className={styles.logoRow}>
                    <span
                      aria-hidden="true"
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '9px',
                        background: `${connector.brandColor}1a`,
                        border: `1px solid ${connector.brandColor}55`,
                        color: connector.brandColor,
                        fontWeight: 800,
                        fontSize: '16px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {connector.brandLetter}
                    </span>
                    <span className={styles.appName}>{connector.name}</span>
                    {renderStatusBadge(connector)}
                  </div>

                  <p className={styles.appDesc}>{connector.desc}</p>

                  {/* Real Status / Details */}
                  <div className={styles.metricsBox}>
                    <div className={styles.metricLine}>
                      <span>Categoría:</span>
                      <strong>{connector.category}</strong>
                    </div>
                    <div className={styles.metricLine}>
                      <span>Autenticación:</span>
                      <strong>{connector.authType}</strong>
                    </div>
                    <div className={styles.metricLine}>
                      <span>Estado BD:</span>
                      <strong>{intData?.status || 'pending_configuration'}</strong>
                    </div>
                    {intData?.updated_at && (
                      <div className={styles.metricLine}>
                        <span>Actualizado:</span>
                        <strong>{new Date(intData.updated_at).toLocaleString()}</strong>
                      </div>
                    )}
                  </div>

                  {/* Specific OAuth Trigger Buttons */}
                  {connector.id === 'shopify' && (
                    <button 
                      className={styles.btnOAuth}
                      onClick={() => setShowShopifyModal(true)}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M15.33 3.67c-.17-.11-.38-.13-.56-.05L12 4.97 9.23 3.62c-.18-.08-.39-.06-.56.05-.18.11-.28.3-.28.51v15.64c0 .21.1.4.28.51.1.06.21.09.32.09.08 0 .16-.02.24-.06L12 19.03l2.77 1.33c.08.04.16.06.24.06.11 0 .22-.03.32-.09.18-.11.28-.3.28-.51V4.18c0-.21-.1-.4-.28-.51z"/>
                      </svg>
                      Iniciar OAuth Real Shopify
                    </button>
                  )}

                  {connector.id === 'mercadolibre' && (
                    <button 
                      className={styles.btnOAuth}
                      onClick={handleStartMercadoLibreOAuth}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z"/>
                      </svg>
                      Iniciar OAuth Real Mercado Libre
                    </button>
                  )}

                  {/* WhatsApp Message Dispatcher */}
                  {connector.id === 'whatsapp' && (
                    <div style={{ background: 'var(--bg2)', padding: '10px', borderRadius: '6px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '8px', border: '1px solid var(--line)' }}>
                      <span style={{ fontWeight: 600, color: 'var(--ink)' }}>Despacho Meta Cloud API:</span>
                      <input 
                        type="text" 
                        value={waTo} 
                        onChange={(e) => setWaTo(e.target.value)}
                        placeholder="Número (+51 987654321)" 
                        style={{ background: 'var(--card)', border: '1px solid var(--line)', padding: '5px 8px', borderRadius: '4px', fontSize: '11px' }}
                      />
                      <textarea 
                        value={waMessage} 
                        onChange={(e) => setWaMessage(e.target.value)}
                        rows={2}
                        placeholder="Mensaje de alerta..." 
                        style={{ background: 'var(--card)', border: '1px solid var(--line)', padding: '5px 8px', borderRadius: '4px', fontSize: '11px', resize: 'none' }}
                      />
                      <button 
                        onClick={handleSendWhatsApp}
                        disabled={waSending}
                        style={{ background: '#059669', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}
                      >
                        {waSending ? 'Enviando a Meta...' : 'Enviar Alerta Real'}
                      </button>
                      {waResult && (
                        <div className={waResult.success ? styles.syncSuccessBox : styles.syncErrorBox}>
                          {waResult.text}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Real Sync Feedback Message */}
                  {syncInfo?.error && (
                    <div className={styles.syncErrorBox}>
                      {syncInfo.error}
                    </div>
                  )}
                  {syncInfo?.success && (
                    <div className={styles.syncSuccessBox}>
                      {syncInfo.success}
                    </div>
                  )}
                </div>

                <div className={styles.cardActions}>
                  <button 
                    className={styles.btnAction} 
                    onClick={() => handleSync(connector)}
                    disabled={syncInfo?.loading}
                  >
                    {syncInfo?.loading ? 'Llamando API...' : 'Sincronizar'}
                  </button>
                  <button 
                    className={styles.btnAction} 
                    onClick={() => {
                      setSelectedConnector(connector);
                      setConfigForm(integrations[connector.id]?.config || {});
                      setSaveStatus(null);
                    }}
                  >
                    Ajustes
                  </button>
                  {CREDENTIAL_FIELDS[connector.id] && (
                    <button
                      type="button"
                      className={styles.btnAction}
                      onClick={() => openCredModal(connector.id)}
                    >
                      Configurar
                    </button>
                  )}
                  {isActive && (
                    <button
                      type="button"
                      className={`${styles.btnAction} ${styles.btnDangerOutline}`}
                      disabled={disconnecting}
                      onClick={() => handleDisconnect(connector.id)}
                      title="Revocar tokens y configuración"
                    >
                      {disconnectConfirm === connector.id ? '¿Confirmar desconexión?' : 'Desconectar'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* TAB 2: MONITOR DE ESTADO */}
      {activeTab === 'alertas' && (
        <div className={styles.alertsGrid}>
          {pendingCount > 0 && (
            <div className={styles.alertCardWarn}>
              <div className={styles.alertInfo}>
                <span className={styles.alertTitle}>Conectores Pendientes de Configuración ({pendingCount})</span>
                <span className={styles.alertDesc}>
                  Las siguientes integraciones no tienen credenciales ni tokens activos en base de datos: {
                    CONNECTOR_DEFINITIONS
                      .filter(c => !integrations[c.id] || integrations[c.id].status === 'pending_configuration')
                      .map(c => c.name)
                      .join(', ')
                  }. Configure sus credenciales o inicie el flujo OAuth para habilitar la sincronización.
                </span>
              </div>
              <span style={{ fontSize: '12px', color: '#d97706', fontWeight: 700 }}>CONFIGURACIÓN REQUERIDA</span>
            </div>
          )}

          <div className={styles.alertCard}>
            <div className={styles.alertInfo}>
              <span className={styles.alertTitle}>Conector SAP S/4HANA OData</span>
              <span className={styles.alertDesc}>
                {!integrations.sap || integrations.sap.status === 'pending_configuration'
                  ? 'Conector disponible. Instancia SAP no configurada. Ingrese el SAP_HOST y credenciales en Ajustes para iniciar la conciliación OData.'
                  : 'Instancia SAP configurada y disponible para llamadas OData.'}
              </span>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--color-slate)', fontWeight: 700 }}>ODATA v4</span>
          </div>

          <div className={styles.alertCard}>
            <div className={styles.alertInfo}>
              <span className={styles.alertTitle}>Meta WhatsApp Cloud API</span>
              <span className={styles.alertDesc}>
                {!integrations.whatsapp || integrations.whatsapp.status === 'pending_configuration'
                  ? 'WhatsApp Business requiere WHATSAPP_ACCESS_TOKEN y WHATSAPP_PHONE_NUMBER_ID para despacho de mensajes.'
                  : 'Conector WhatsApp listo para despacho.'}
              </span>
            </div>
            <span style={{ fontSize: '12px', color: '#059669', fontWeight: 700 }}>META CLOUD</span>
          </div>
        </div>
      )}

      {/* TAB 3: LIVE EVENT LOGS (REAL BD LOGS) */}
      {activeTab === 'logs' && (
        <div className={styles.logsCard}>
          <div className={styles.logsToolbar}>
            <div className={styles.logsFilters}>
              <select 
                className={styles.formSelect} 
                style={{ padding: '6px 10px', fontSize: '12px' }}
                value={logFilter}
                onChange={(e) => setLogFilter(e.target.value as any)}
              >
                <option value="ALL">Todos los Niveles</option>
                <option value="SUCCESS">SUCCESS</option>
                <option value="INFO">INFO</option>
                <option value="WARN">WARN</option>
                <option value="ERROR">ERROR</option>
              </select>

              <input 
                type="text" 
                placeholder="Filtrar por acción, integración, resultado..." 
                className={styles.logsSearch}
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
              />
            </div>
            <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
              Mostrando <strong>{filteredLogs.length}</strong> logs reales registrados en BD
            </span>
          </div>

          <div className={styles.logsConsole}>
            {filteredLogs.length === 0 ? (
              <div style={{ color: 'var(--color-slate)', padding: '20px', textAlign: 'center' }}>
                No hay eventos registrados en la base de datos todavía. Haga clic en "Sincronizar" en cualquier conector para registrar eventos reales.
              </div>
            ) : (
              filteredLogs.map((log) => (
                <div key={log.id} className={styles.logLine}>
                  <span className={styles.logTimestamp}>{new Date(log.fecha).toLocaleTimeString()}</span>
                  <span className={
                    log.nivel === 'SUCCESS' ? styles.logLevelSuccess :
                    log.nivel === 'INFO' ? styles.logLevelInfo :
                    log.nivel === 'WARN' ? styles.logLevelWarn : styles.logLevelError
                  }>
                    [{log.nivel}]
                  </span>
                  <span className={styles.logSystem}>{log.integracion.toUpperCase()}</span>
                  <span className={styles.logMessage}>
                    <strong>{log.accion}:</strong> {log.resultado}
                    {log.errores && <span style={{ color: '#f87171', display: 'block', fontSize: '11px', marginTop: '2px' }}>Detalle: {log.errores}</span>}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 4: AUDITORÍA (REAL BD RECORDS) */}
      {activeTab === 'auditoria' && (
        <div className={styles.auditTableCard}>
          <table className={styles.auditTable}>
            <thead>
              <tr>
                <th>FECHA / HORA</th>
                <th>USUARIO</th>
                <th>INTEGRACIÓN</th>
                <th>ACCIÓN</th>
                <th>RESULTADO</th>
                <th>ERRORES</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--muted)', padding: '24px' }}>
                    No hay registros de auditoría en la base de datos.
                  </td>
                </tr>
              ) : (
                logs.map((row) => (
                  <tr key={row.id}>
                    <td>{new Date(row.fecha).toLocaleString()}</td>
                    <td><strong>{row.usuario}</strong></td>
                    <td>{row.integracion.toUpperCase()}</td>
                    <td><span className={styles.codePill}>{row.accion}</span></td>
                    <td>
                      <span style={{ 
                        color: row.nivel === 'SUCCESS' ? '#059669' : row.nivel === 'ERROR' ? 'var(--color-alarm-red)' : '#d97706',
                        fontWeight: 600 
                      }}>
                        {row.resultado}
                      </span>
                    </td>
                    <td>
                      {row.errores ? (
                        <span style={{ color: 'var(--color-alarm-red)', fontSize: '11px' }}>{row.errores}</span>
                      ) : (
                        <span style={{ color: 'var(--muted)', fontSize: '11px' }}>Ninguno</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL SHOPIFY OAUTH */}
      {showShopifyModal && (
        <>
          <div className={styles.drawerBackdrop} onClick={() => setShowShopifyModal(false)} />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'var(--card)',
            border: '1px solid var(--line)',
            borderRadius: '10px',
            padding: '24px',
            zIndex: 1001,
            width: '440px',
            maxWidth: '90vw',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--ink)' }}>Conectar Shopify Plus con OAuth</h3>
            <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.5 }}>
              Ingrese la URL de su tienda Shopify para iniciar la autorización OAuth 2.0 y obtener tokens de acceso a /products, /orders e /inventory.
            </p>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Dominio de la Tienda (myshopify.com)</label>
              <input 
                type="text" 
                placeholder="mi-tienda.myshopify.com" 
                value={shopifyShopDomain}
                onChange={(e) => setShopifyShopDomain(e.target.value)}
                className={styles.formInput} 
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button className={styles.btnAction} onClick={() => setShowShopifyModal(false)}>Cancelar</button>
              <button className={styles.btnPrimary} onClick={handleStartShopifyOAuth}>Continuar a Shopify</button>
            </div>
          </div>
        </>
      )}

      {/* DRAWER LATERAL DE AJUSTES */}
      {selectedConnector && (
        <>
          <div className={styles.drawerBackdrop} onClick={() => setSelectedConnector(null)} />
          <div className={styles.drawer}>
            <div className={styles.drawerHeader}>
              <div>
                <h2 className={styles.drawerTitle}>{selectedConnector.name}</h2>
                <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Configuración Real y Credenciales</span>
              </div>
              <button className={styles.drawerClose} onClick={() => setSelectedConnector(null)}>✕</button>
            </div>

            <div className={styles.drawerTabs}>
              <button 
                className={`${styles.drawerTabItem} ${drawerTab === 'credenciales' ? styles.drawerTabActive : ''}`}
                onClick={() => setDrawerTab('credenciales')}
              >
                Credenciales
              </button>
              <button 
                className={`${styles.drawerTabItem} ${drawerTab === 'sincronizacion' ? styles.drawerTabActive : ''}`}
                onClick={() => setDrawerTab('sincronizacion')}
              >
                Endpoints
              </button>
              <button 
                className={`${styles.drawerTabItem} ${drawerTab === 'webhooks' ? styles.drawerTabActive : ''}`}
                onClick={() => setDrawerTab('webhooks')}
              >
                Webhooks
              </button>
            </div>

            <div className={styles.drawerBody}>
              {drawerTab === 'credenciales' && (
                <>
                  {selectedConnector.id === 'shopify' && (
                    <>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Shop Domain (.myshopify.com)</label>
                        <input 
                          type="text" 
                          placeholder="mi-tienda.myshopify.com"
                          value={configForm.shop_domain || ''}
                          onChange={(e) => setConfigForm({ ...configForm, shop_domain: e.target.value })}
                          className={styles.formInput} 
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Admin API Access Token (shpat_...)</label>
                        <input 
                          type="password" 
                          placeholder="shpat_xxxxxxxxxxxxxxxxxxxx"
                          value={configForm.access_token || ''}
                          onChange={(e) => setConfigForm({ ...configForm, access_token: e.target.value })}
                          className={styles.formInput} 
                        />
                      </div>
                    </>
                  )}

                  {selectedConnector.id === 'mercadolibre' && (
                    <>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Mercado Libre Access Token (APP_USR-...)</label>
                        <input 
                          type="password" 
                          placeholder="APP_USR-xxxxxxxx"
                          value={configForm.access_token || ''}
                          onChange={(e) => setConfigForm({ ...configForm, access_token: e.target.value })}
                          className={styles.formInput} 
                        />
                      </div>
                      <button 
                        className={styles.btnOAuth} 
                        onClick={handleStartMercadoLibreOAuth}
                        style={{ marginTop: '4px' }}
                      >
                        Autorizar mediante OAuth Oficial de Mercado Libre
                      </button>
                    </>
                  )}

                  {selectedConnector.id === 'whatsapp' && (
                    <>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Meta Phone Number ID</label>
                        <input 
                          type="text" 
                          placeholder="Ej: 1084920491823"
                          value={configForm.phone_number_id || ''}
                          onChange={(e) => setConfigForm({ ...configForm, phone_number_id: e.target.value })}
                          className={styles.formInput} 
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Meta Permanent User Token (Bearer)</label>
                        <input 
                          type="password" 
                          placeholder="EAA..."
                          value={configForm.access_token || ''}
                          onChange={(e) => setConfigForm({ ...configForm, access_token: e.target.value })}
                          className={styles.formInput} 
                        />
                      </div>
                    </>
                  )}

                  {selectedConnector.id === 'sap' && (
                    <>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>SAP Host / Endpoint URL</label>
                        <input 
                          type="text" 
                          placeholder="https://s4hana.empresa.com:44300"
                          value={configForm.host || ''}
                          onChange={(e) => setConfigForm({ ...configForm, host: e.target.value })}
                          className={styles.formInput} 
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>SAP Client (Mandante)</label>
                        <input 
                          type="text" 
                          placeholder="100"
                          value={configForm.client || '100'}
                          onChange={(e) => setConfigForm({ ...configForm, client: e.target.value })}
                          className={styles.formInput} 
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>SAP API Key o Usuario</label>
                        <input 
                          type="text" 
                          placeholder="Usuario SAP o APIKey"
                          value={configForm.username || configForm.api_key || ''}
                          onChange={(e) => setConfigForm({ ...configForm, username: e.target.value })}
                          className={styles.formInput} 
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>SAP Password (para Basic Auth)</label>
                        <input 
                          type="password" 
                          placeholder="••••••••••••"
                          value={configForm.password || ''}
                          onChange={(e) => setConfigForm({ ...configForm, password: e.target.value })}
                          className={styles.formInput} 
                        />
                      </div>
                    </>
                  )}

                  {selectedConnector.id !== 'shopify' && selectedConnector.id !== 'mercadolibre' && selectedConnector.id !== 'whatsapp' && selectedConnector.id !== 'sap' && (
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Access Key / Token</label>
                      <input 
                        type="password" 
                        placeholder="Credencial de acceso..."
                        value={configForm.access_token || ''}
                        onChange={(e) => setConfigForm({ ...configForm, access_token: e.target.value })}
                        className={styles.formInput} 
                      />
                    </div>
                  )}

                  {saveStatus && (
                    <div className={saveStatus.startsWith('✓') ? styles.syncSuccessBox : styles.syncErrorBox}>
                      {saveStatus}
                    </div>
                  )}
                </>
              )}

              {drawerTab === 'sincronizacion' && (
                <>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Endpoint Base</label>
                    <input 
                      type="text" 
                      value={selectedConnector.defaultEndpoint} 
                      readOnly 
                      className={styles.formInput} 
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Ruta de Sincronización Inventa.AI</label>
                    <input 
                      type="text" 
                      value={selectedConnector.syncEndpoint} 
                      readOnly 
                      className={styles.formInput} 
                    />
                  </div>
                </>
              )}

              {drawerTab === 'webhooks' && (
                <>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Webhook Ingest Listener (Inventa.AI)</label>
                    <input 
                      type="text" 
                      value={`https://inventa-ai-nine.vercel.app/api/webhooks/${selectedConnector.id}`} 
                      readOnly 
                      className={styles.formInput} 
                    />
                  </div>
                </>
              )}
            </div>

            <div className={styles.drawerFooter}>
              <button 
                className={styles.btnAction} 
                onClick={() => setSelectedConnector(null)}
              >
                Cerrar
              </button>
              <button 
                className={styles.btnPrimary}
                onClick={handleSaveConfig}
              >
                Guardar en Base de Datos
              </button>
            </div>
          </div>
        </>
      )}

      {/* Modal de credenciales manuales (verificación viva) */}
      {credProvider && (
        <>
          <div className={styles.drawerBackdrop} onClick={() => !credLoading && setCredProvider(null)} />
          <div
            className={styles.drawer}
            role="dialog"
            aria-modal="true"
            aria-label={`Configurar ${credProvider}`}
            style={{ maxWidth: '440px', margin: '10vh auto', height: 'auto', maxHeight: '86vh' }}
          >
            <div className={styles.drawerHeader}>
              <span className={styles.drawerTitle}>
                Conectar {CONNECTOR_DEFINITIONS.find((c) => c.id === credProvider)?.name || credProvider}
              </span>
              <button
                type="button"
                className={styles.drawerClose}
                onClick={() => !credLoading && setCredProvider(null)}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>
            <form
              className={styles.drawerBody}
              onSubmit={handleSaveCredentials}
              style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
            >
              <p style={{ fontSize: '13px', color: 'var(--ink)', opacity: 0.75, margin: 0 }}>
                Las llaves se verifican en vivo contra la API oficial antes de guardarse. Nada se almacena sin validar.
              </p>
              {(CREDENTIAL_FIELDS[credProvider] || []).map((f) => (
                <label key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', fontWeight: 600 }}>
                  {f.label} *
                  <input
                    type={f.secret ? 'password' : 'text'}
                    value={credValues[f.key] || ''}
                    onChange={(e) => setCredValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    required
                    autoComplete="off"
                    style={{
                      padding: '10px 12px',
                      minHeight: '44px',
                      borderRadius: '10px',
                      border: '1px solid var(--line)',
                      background: 'var(--card)',
                      color: 'var(--ink)',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                  />
                </label>
              ))}
              {credError && (
                <div role="alert" style={{ background: '#fef2f2', border: '1px solid var(--color-alarm-red)', color: '#991b1b', padding: '10px 12px', borderRadius: '10px', fontSize: '13px', fontWeight: 600 }}>
                  {credError}
                </div>
              )}
              {credOk && (
                <div role="status" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '10px 12px', borderRadius: '10px', fontSize: '13px', fontWeight: 600 }}>
                  {credOk}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className={styles.btnAction}
                  onClick={() => !credLoading && setCredProvider(null)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={styles.btnPrimary}
                  disabled={credLoading}
                >
                  {credLoading ? 'Verificando…' : 'Verificar y guardar'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
