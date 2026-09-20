'use client';

import { useState } from 'react';
import styles from './page.module.css';

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';
  system: string;
  message: string;
}

interface AuditEntry {
  id: string;
  user: string;
  date: string;
  action: string;
  system: string;
  result: string;
  ip: string;
}

interface Connector {
  id: string;
  name: string;
  category: string;
  desc: string;
  status: 'connected' | 'syncing' | 'error';
  lastSync: string;
  syncProgress?: number;
  syncStatusText?: string;
  metrics: { [key: string]: string };
  config: {
    endpoint: string;
    authType: string;
    syncFreq: string;
    webhookUrl: string;
    webhookSecret: string;
    events: string[];
    autoPauseStock: boolean;
    safetyBuffer: number;
  };
}

const initialConnectors: Connector[] = [
  {
    id: 'shopify',
    name: 'Shopify Plus',
    category: 'E-commerce B2B',
    desc: 'Sincronización de pedidos en tiempo real, inventario multialmacén y precios por volumen.',
    status: 'connected',
    lastSync: 'Hace 1 minuto',
    metrics: {
      'Pedidos Sincronizados': '1,420',
      'Inventario Mapeado': '540 SKUs',
      'Errores API': '0 (0.00%)',
      'Modo': 'REST Admin 2026-04'
    },
    config: {
      endpoint: 'https://distribuidora-sanmartin.myshopify.com/admin/api/2026-04',
      authType: 'Admin Access Token (shpat_***)',
      syncFreq: '5m',
      webhookUrl: 'https://api.inventa.ai/v1/webhooks/shopify/orders_create',
      webhookSecret: 'shsec_8f93a0d78b19284',
      events: ['orders/create', 'orders/cancelled', 'inventory_levels/update'],
      autoPauseStock: true,
      safetyBuffer: 5
    }
  },
  {
    id: 'amazon',
    name: 'Amazon Business',
    category: 'Marketplace',
    desc: 'Integración de órdenes FBA y cumplimiento multicanal con actualización de stock cada 5m.',
    status: 'connected',
    lastSync: 'Hace 3 minutos',
    metrics: {
      'SKUs Sincronizados': '320 SKUs',
      'Buy Box Activa': '98.4%',
      'Stock FBA': '4,820 u',
      'Stock FBM': '1,250 u'
    },
    config: {
      endpoint: 'https://sellingpartnerapi-na.amazon.com',
      authType: 'LWA OAuth 2.0 (SP-API v2)',
      syncFreq: '5m',
      webhookUrl: 'https://api.inventa.ai/v1/webhooks/amazon/sqs-feed',
      webhookSecret: 'amzsec_44129b8c9d120a',
      events: ['ORDER_CHANGE', 'PRICING_HEALTH', 'FBA_INVENTORY_REPORT'],
      autoPauseStock: true,
      safetyBuffer: 10
    }
  },
  {
    id: 'sap',
    name: 'SAP S/4HANA',
    category: 'ERP Empresarial',
    desc: 'Conciliación de módulos MM (Material Management) y SD (Sales & Distribution) vía RFC/REST.',
    status: 'connected',
    lastSync: 'Hace 8 minutos',
    metrics: {
      'Materiales MM': '840 ítems',
      'OCs Procesadas': '12 hoy',
      'Protocolo': 'OData v4 / RFC',
      'Latencia Conexión': '142 ms'
    },
    config: {
      endpoint: 'https://s4hana.sanmartin.pe:44300/sap/opu/odata4/sap/api_purchaseorder',
      authType: 'X.509 Client Certificate + Basic Auth',
      syncFreq: '15m',
      webhookUrl: 'https://api.inventa.ai/v1/webhooks/sap/idoc-receiver',
      webhookSecret: 'sapsec_99182390aefd',
      events: ['BUS2012_CREATED', 'BUS2032_MODIFIED', 'MATMAS_SAVE'],
      autoPauseStock: false,
      safetyBuffer: 0
    }
  },
  {
    id: 'meli',
    name: 'Mercado Libre',
    category: 'Marketplace',
    desc: 'Monitoreo de publicaciones Full y actualización automática de stock de seguridad.',
    status: 'connected',
    lastSync: 'Hace 12 minutos',
    metrics: {
      'Publicaciones Activas': '180 activas',
      'Ventas del Día': '42 ventas',
      'Pausadas por Stock': '2 SKUs',
      'Estado OAuth': 'Token Válido (28d)'
    },
    config: {
      endpoint: 'https://api.mercadolibre.com',
      authType: 'OAuth 2.0 Bearer Token (APP_ID 74819)',
      syncFreq: '5m',
      webhookUrl: 'https://api.inventa.ai/v1/webhooks/meli/notifications',
      webhookSecret: 'mlsec_109284bfaec',
      events: ['orders_v2', 'items', 'questions'],
      autoPauseStock: true,
      safetyBuffer: 3
    }
  },
  {
    id: 'sunat',
    name: 'SUNAT Facturación',
    category: 'Fiscal / OSE',
    desc: 'Emisión automática de Guías de Remisión Electrónicas (GRE) y Facturas comerciales.',
    status: 'connected',
    lastSync: 'Hace 2 minutos',
    metrics: {
      'Facturas Emitidas Hoy': '154 CPEs',
      'Guías Remisión (GRE)': '38 remitidas',
      'Operador OSE': 'Digiflow (Activo)',
      'Consulta RUC': 'En línea (200 OK)'
    },
    config: {
      endpoint: 'https://e-factura.sunat.gob.pe/ol-ti-itcpfegem/billService',
      authType: 'Clave SOL + Certificado Digital X.509',
      syncFreq: 'En tiempo real',
      webhookUrl: 'https://api.inventa.ai/v1/webhooks/sunat/cdr-listener',
      webhookSecret: 'sunat_sig_391848',
      events: ['CDR_RECEIVED', 'GRE_STATUS_CHANGE', 'ANULACION_CPE'],
      autoPauseStock: false,
      safetyBuffer: 0
    }
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Business API',
    category: 'Notificaciones',
    desc: 'Alertas inmediatas a Jefes de Almacén y Compradores cuando un SKU entra en estado crítico.',
    status: 'connected',
    lastSync: 'En tiempo real',
    metrics: {
      'Meta Cloud API': 'v19.0 (Activa)',
      'Plantillas Aprobadas': '4 templates',
      'Destinatarios': '3 teléfonos',
      'Alertas Enviadas': '28 hoy'
    },
    config: {
      endpoint: 'https://graph.facebook.com/v19.0/1084920491823/messages',
      authType: 'System User Permanent Access Token',
      syncFreq: 'Instantáneo',
      webhookUrl: 'https://api.inventa.ai/v1/webhooks/meta/whatsapp-status',
      webhookSecret: 'wasec_091824a87c',
      events: ['message_delivered', 'message_read', 'template_status_update'],
      autoPauseStock: false,
      safetyBuffer: 0
    }
  },
];

const initialLogs: LogEntry[] = [
  { id: '1', timestamp: '15:32:04', level: 'SUCCESS', system: 'SHOPIFY', message: 'Sync completado: 32 productos actualizados, 5 pedidos nuevos, 0 errores.' },
  { id: '2', timestamp: '15:31:40', level: 'INFO', system: 'SAP S/4HANA', message: 'RFC BAPI_PO_CREATE ejecutado para OC-2026-089. Doc SAP #4500019283.' },
  { id: '3', timestamp: '15:30:12', level: 'SUCCESS', system: 'SUNAT', message: 'CDR recibido con éxito para Factura F001-0004928. Hash validado.' },
  { id: '4', timestamp: '15:28:55', level: 'WARN', system: 'MELI', message: 'Publicación MLA-8491 pausada automáticamente: Stock disponible (2) < Buffer (3).' },
  { id: '5', timestamp: '15:27:01', level: 'INFO', system: 'AMAZON', message: 'Descargado reporte FBA Inventory. 4,820 unidades conciliadas en almacén Callao.' },
  { id: '6', timestamp: '15:25:20', level: 'SUCCESS', system: 'WHATSAPP', message: 'Alerta de Quiebre enviada a +51 987 654 321 (Jefe Almacén) para SKU-ALI-001.' },
];

const initialAudit: AuditEntry[] = [
  { id: '1', user: 'j.gonzalez@sanmartin.pe', date: '2026-09-19 15:32:04', action: 'MANUAL_SYNC_TRIGGER', system: 'Shopify Plus', result: '200 OK (32 items)', ip: '190.234.12.88' },
  { id: '2', user: 'sistema_daemon', date: '2026-09-19 15:31:40', action: 'EXPORT_PURCHASE_ORDER', system: 'SAP S/4HANA', result: '201 Created (#4500019283)', ip: '10.0.4.12' },
  { id: '3', user: 'sistema_daemon', date: '2026-09-19 15:30:12', action: 'EMIT_CPE_FACTURA', system: 'SUNAT / OSE', result: '200 OK (CDR Aceptado)', ip: '10.0.4.12' },
  { id: '4', user: 'm.ramirez@sanmartin.pe', date: '2026-09-19 15:22:10', action: 'UPDATE_WEBHOOK_CONFIG', system: 'Mercado Libre', result: '200 OK', ip: '190.234.12.92' },
  { id: '5', user: 'j.gonzalez@sanmartin.pe', date: '2026-09-19 15:10:05', action: 'TEST_API_CONNECTION', system: 'Amazon Business', result: '200 OK (Latency: 92ms)', ip: '190.234.12.88' },
];

export default function IntegracionesPage() {
  const [activeTab, setActiveTab] = useState<'conectores' | 'alertas' | 'logs' | 'auditoria'>('conectores');
  const [connectors, setConnectors] = useState<Connector[]>(initialConnectors);
  const [logs, setLogs] = useState<LogEntry[]>(initialLogs);
  const [audit, setAudit] = useState<AuditEntry[]>(initialAudit);
  
  // Drawer state
  const [selectedConnector, setSelectedConnector] = useState<Connector | null>(null);
  const [drawerTab, setDrawerTab] = useState<'credenciales' | 'sincronizacion' | 'webhooks' | 'reglas'>('credenciales');
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Filters for logs
  const [logFilter, setLogFilter] = useState<'ALL' | 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS'>('ALL');
  const [logSearch, setLogSearch] = useState('');

  // RUC search state for SUNAT
  const [rucInput, setRucInput] = useState('20601234567');
  const [rucResult, setRucResult] = useState<string | null>(null);

  // WhatsApp test alert
  const [waSending, setWaSending] = useState(false);

  // Functional Sychronization
  const handleSync = (id: string) => {
    setConnectors(prev => prev.map(c => {
      if (c.id === id) {
        return { ...c, status: 'syncing', syncProgress: 15, syncStatusText: 'Conectando con endpoint API...' };
      }
      return c;
    }));

    setTimeout(() => {
      setConnectors(prev => prev.map(c => {
        if (c.id === id) {
          return { ...c, syncProgress: 60, syncStatusText: 'Descargando eventos y conciliando inventario...' };
        }
        return c;
      }));
    }, 800);

    setTimeout(() => {
      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0];

      setConnectors(prev => prev.map(c => {
        if (c.id === id) {
          return { 
            ...c, 
            status: 'connected', 
            syncProgress: 100, 
            lastSync: 'Hace unos segundos',
            syncStatusText: undefined 
          };
        }
        return c;
      }));

      const connName = connectors.find(c => c.id === id)?.name || id;
      const newLog: LogEntry = {
        id: Date.now().toString(),
        timestamp: timeStr,
        level: 'SUCCESS',
        system: connName.toUpperCase(),
        message: `Sincronización manual completada con éxito. 32 registros actualizados, 0 errores.`
      };
      setLogs(prev => [newLog, ...prev]);

      const newAudit: AuditEntry = {
        id: Date.now().toString(),
        user: 'j.gonzalez@sanmartin.pe',
        date: `${now.toISOString().split('T')[0]} ${timeStr}`,
        action: 'MANUAL_SYNC_TRIGGER',
        system: connName,
        result: '200 OK (32 items)',
        ip: '190.234.12.88'
      };
      setAudit(prev => [newAudit, ...prev]);

    }, 1800);
  };

  // Test Connection
  const handleTestConnection = () => {
    setIsTesting(true);
    setTestResult(null);
    setTimeout(() => {
      setIsTesting(false);
      setTestResult('✓ Conexión exitosa (HTTP 200 OK · Latencia: 118 ms · TLS 1.3 verificado)');
    }, 900);
  };

  // Test SUNAT RUC
  const handleQueryRuc = () => {
    setRucResult('Consultando OSE / SUNAT...');
    setTimeout(() => {
      setRucResult(`✓ RUC ${rucInput}: ALICORP S.A.A. · Estado: ACTIVO · Condición: HABIDO · Agente de Retención: SÍ`);
    }, 600);
  };

  // Test WhatsApp
  const handleSendWaTest = () => {
    setWaSending(true);
    setTimeout(() => {
      setWaSending(false);
      alert('✓ Alerta de prueba enviada a +51 987 654 321 (Jefe Almacén): "ALERTA INVENTA.AI: SKU-ALI-001 Aceite Primor 1L en quiebre inminente (1.9 días de stock restante)".');
    }, 700);
  };

  const filteredLogs = logs.filter(l => {
    const matchesLevel = logFilter === 'ALL' || l.level === logFilter;
    const matchesSearch = l.message.toLowerCase().includes(logSearch.toLowerCase()) || 
                          l.system.toLowerCase().includes(logSearch.toLowerCase());
    return matchesLevel && matchesSearch;
  });

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Integraciones & Conectores ERP</h1>
          <p className={styles.subtitle}>
            Hub operacional de sincronización bidireccional de pedidos, inventario, catálogos y sistemas fiscales.
          </p>
        </div>
        <button 
          className={styles.btnPrimary}
          onClick={() => alert('Asistente de Integración Enterprise: Permite conectar Oracle NetSuite, VTEX, WooCommerce y SAP.')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Conectar Nueva App
        </button>
      </header>

      {/* 1. Header KPIs Monitor */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Integraciones Activas</span>
          <span className={styles.kpiValue}>6 / 6</span>
          <span className={`${styles.kpiStatus} ${styles.statusGreen}`}>● 100% Operativas</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Conexiones con Error</span>
          <span className={styles.kpiValue}>0</span>
          <span className={`${styles.kpiStatus} ${styles.statusGreen}`}>Cero interrupciones</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Última Sincronización</span>
          <span className={styles.kpiValue}>Hace 1m</span>
          <span className={`${styles.kpiStatus} ${styles.statusBlue}`}>Global programada (5m)</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Latencia Media (p95)</span>
          <span className={styles.kpiValue}>128 ms</span>
          <span className={`${styles.kpiStatus} ${styles.statusGreen}`}>Rendimiento óptimo</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Disponibilidad (SLA)</span>
          <span className={styles.kpiValue}>99.98%</span>
          <span className={`${styles.kpiStatus} ${styles.statusGreen}`}>Enterprise Ready</span>
        </div>
      </div>

      {/* 2. Tabs Navigation */}
      <div className={styles.tabsNav}>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'conectores' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('conectores')}
        >
          Conectores Activos
          <span className={styles.tabBadge}>6</span>
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'alertas' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('alertas')}
        >
          Monitor de Alertas
          <span className={styles.tabBadgeAlert}>0</span>
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
          <span className={styles.tabBadge}>{audit.length}</span>
        </button>
      </div>

      {/* TAB 1: CONECTORES */}
      {activeTab === 'conectores' && (
        <div className={styles.grid}>
          {connectors.map((app) => (
            <div key={app.id} className={styles.card}>
              <div className={styles.cardTop}>
                <div className={styles.logoRow}>
                  <span className={styles.appName}>{app.name}</span>
                  {app.status === 'syncing' ? (
                    <span className={styles.badgeSyncing}>
                      <span className={styles.badgeDotPulse}></span>
                      Sincronizando
                    </span>
                  ) : (
                    <span className={styles.badgeConnected}>
                      <span className={styles.badgeDot}></span>
                      Activo
                    </span>
                  )}
                </div>

                <p className={styles.appDesc}>{app.desc}</p>

                {/* Specific Metrics */}
                <div className={styles.metricsBox}>
                  {Object.entries(app.metrics).map(([key, val]) => (
                    <div key={key} className={styles.metricLine}>
                      <span>{key}:</span>
                      <strong>{val}</strong>
                    </div>
                  ))}
                </div>

                {/* Progress bar during sync */}
                {app.status === 'syncing' ? (
                  <div className={styles.syncProgress}>
                    <span className={styles.progressText}>{app.syncStatusText}</span>
                    <div className={styles.progressBar}>
                      <div className={styles.progressFill} style={{ width: `${app.syncProgress}%` }}></div>
                    </div>
                  </div>
                ) : (
                  <div className={styles.syncInfo}>
                    <span>Frecuencia: <strong>{app.config.syncFreq}</strong></span>
                    <span>Última: <strong>{app.lastSync}</strong></span>
                  </div>
                )}
              </div>

              {/* Extra Tools for SUNAT & WhatsApp */}
              {app.id === 'sunat' && (
                <div style={{ background: 'var(--bg2)', padding: '10px', borderRadius: '6px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input 
                      type="text" 
                      value={rucInput} 
                      onChange={(e) => setRucInput(e.target.value)}
                      placeholder="Consultar RUC..." 
                      style={{ background: 'var(--card)', border: '1px solid var(--line)', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', flex: 1 }}
                    />
                    <button 
                      onClick={handleQueryRuc}
                      style={{ background: 'var(--primary)', color: 'var(--bg)', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}
                    >
                      Consultar
                    </button>
                  </div>
                  {rucResult && <span style={{ color: '#059669', fontSize: '11px' }}>{rucResult}</span>}
                </div>
              )}

              {app.id === 'whatsapp' && (
                <div style={{ background: 'var(--bg2)', padding: '10px', borderRadius: '6px', fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Disparador de Alertas:</span>
                  <button 
                    onClick={handleSendWaTest}
                    disabled={waSending}
                    style={{ background: '#059669', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}
                  >
                    {waSending ? 'Enviando...' : 'Probar Alerta'}
                  </button>
                </div>
              )}

              <div className={styles.cardActions}>
                <button 
                  className={styles.btnAction} 
                  onClick={() => handleSync(app.id)}
                  disabled={app.status === 'syncing'}
                >
                  {app.status === 'syncing' ? 'Procesando...' : 'Sincronizar'}
                </button>
                <button 
                  className={styles.btnAction} 
                  onClick={() => {
                    setSelectedConnector(app);
                    setTestResult(null);
                  }}
                >
                  Ajustes
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: ALERTAS */}
      {activeTab === 'alertas' && (
        <div className={styles.alertsGrid}>
          <div className={styles.alertCard}>
            <div className={styles.alertInfo}>
              <span className={styles.alertTitle}>Todas las conexiones en estado óptimo</span>
              <span className={styles.alertDesc}>
                No se registran tokens expirados, webhooks caídos ni demoras de sincronización en las últimas 24 horas.
              </span>
            </div>
            <span style={{ fontSize: '12px', color: '#059669', fontWeight: 700 }}>100% HEALTHY</span>
          </div>

          <div className={styles.alertCardWarn}>
            <div className={styles.alertInfo}>
              <span className={styles.alertTitle}>Mantenimiento Programado SAP S/4HANA</span>
              <span className={styles.alertDesc}>
                Ventana de actualización de certificados TLS por parte del equipo de TI: Domingo 27 Sep 02:00 - 03:00 UTC.
              </span>
            </div>
            <span style={{ fontSize: '12px', color: '#d97706', fontWeight: 700 }}>PROGRAMADO</span>
          </div>
        </div>
      )}

      {/* TAB 3: LIVE EVENT LOGS */}
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
                placeholder="Filtrar eventos o palabras clave..." 
                className={styles.logsSearch}
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
              />
            </div>
            <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
              Mostrando <strong>{filteredLogs.length}</strong> eventos en vivo
            </span>
          </div>

          <div className={styles.logsConsole}>
            {filteredLogs.map((log) => (
              <div key={log.id} className={styles.logLine}>
                <span className={styles.logTimestamp}>{log.timestamp}</span>
                <span className={
                  log.level === 'SUCCESS' ? styles.logLevelSuccess :
                  log.level === 'INFO' ? styles.logLevelInfo :
                  log.level === 'WARN' ? styles.logLevelWarn : styles.logLevelError
                }>
                  [{log.level}]
                </span>
                <span className={styles.logSystem}>{log.system}</span>
                <span className={styles.logMessage}>{log.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: AUDITORÍA */}
      {activeTab === 'auditoria' && (
        <div className={styles.auditTableCard}>
          <table className={styles.auditTable}>
            <thead>
              <tr>
                <th>USUARIO</th>
                <th>FECHA / HORA</th>
                <th>ACCIÓN</th>
                <th>SISTEMA</th>
                <th>RESULTADO</th>
                <th>IP ORIGEN</th>
              </tr>
            </thead>
            <tbody>
              {audit.map((row) => (
                <tr key={row.id}>
                  <td><strong>{row.user}</strong></td>
                  <td>{row.date}</td>
                  <td><span className={styles.codePill}>{row.action}</span></td>
                  <td>{row.system}</td>
                  <td><span style={{ color: '#059669', fontWeight: 600 }}>{row.result}</span></td>
                  <td><code>{row.ip}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 4. DRAWER LATERAL DE AJUSTES */}
      {selectedConnector && (
        <>
          <div className={styles.drawerBackdrop} onClick={() => setSelectedConnector(null)} />
          <div className={styles.drawer}>
            <div className={styles.drawerHeader}>
              <div>
                <h2 className={styles.drawerTitle}>{selectedConnector.name}</h2>
                <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Ajustes de Conexión & Webhooks</span>
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
                Sincronización
              </button>
              <button 
                className={`${styles.drawerTabItem} ${drawerTab === 'webhooks' ? styles.drawerTabActive : ''}`}
                onClick={() => setDrawerTab('webhooks')}
              >
                Webhooks
              </button>
              <button 
                className={`${styles.drawerTabItem} ${drawerTab === 'reglas' ? styles.drawerTabActive : ''}`}
                onClick={() => setDrawerTab('reglas')}
              >
                Reglas
              </button>
            </div>

            <div className={styles.drawerBody}>
              {drawerTab === 'credenciales' && (
                <>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>API Endpoint URL</label>
                    <input 
                      type="text" 
                      defaultValue={selectedConnector.config.endpoint}
                      className={styles.formInput} 
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Método de Autenticación</label>
                    <input 
                      type="text" 
                      defaultValue={selectedConnector.config.authType}
                      className={styles.formInput} 
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Access Token / API Secret</label>
                    <input 
                      type="password" 
                      defaultValue="shpat_892837492837498273492837492"
                      className={styles.formInput} 
                    />
                  </div>

                  <button 
                    className={styles.btnTestConn} 
                    onClick={handleTestConnection}
                    disabled={isTesting}
                  >
                    {isTesting ? 'Verificando con servidor remoto...' : 'Probar Conexión API'}
                  </button>

                  {testResult && (
                    <div className={`${styles.testConnResult} ${styles.testSuccess}`}>
                      {testResult}
                    </div>
                  )}
                </>
              )}

              {drawerTab === 'sincronizacion' && (
                <>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Frecuencia de Refresco Automático</label>
                    <select className={styles.formSelect} defaultValue={selectedConnector.config.syncFreq}>
                      <option value="1m">Cada 1 minuto (Tiempo Real)</option>
                      <option value="5m">Cada 5 minutos (Recomendado)</option>
                      <option value="15m">Cada 15 minutos</option>
                      <option value="1h">Cada 1 hora</option>
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Entidades Habilitadas para Conciliar</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', marginTop: '6px' }}>
                      <label><input type="checkbox" defaultChecked /> Catálogo de Productos y SKUs</label>
                      <label><input type="checkbox" defaultChecked /> Niveles de Inventario Físico</label>
                      <label><input type="checkbox" defaultChecked /> Pedidos y Órdenes de Compra</label>
                      <label><input type="checkbox" defaultChecked /> Clientes y Facturas Comerciales</label>
                    </div>
                  </div>
                </>
              )}

              {drawerTab === 'webhooks' && (
                <>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Webhook Ingest Listener (Inventa.AI)</label>
                    <input 
                      type="text" 
                      defaultValue={selectedConnector.config.webhookUrl}
                      className={styles.formInput} 
                      readOnly 
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>HMAC Signature Secret</label>
                    <input 
                      type="password" 
                      defaultValue={selectedConnector.config.webhookSecret}
                      className={styles.formInput} 
                      readOnly 
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Tópicos Suscritos</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
                      {selectedConnector.config.events.map((ev) => (
                        <div key={ev} style={{ background: 'var(--bg2)', padding: '6px 10px', borderRadius: '4px', fontFamily: 'monospace' }}>
                          ✓ {ev}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {drawerTab === 'reglas' && (
                <>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Buffer de Seguridad para Evitar Quiebre (unidades)</label>
                    <input 
                      type="number" 
                      defaultValue={selectedConnector.config.safetyBuffer}
                      className={styles.formInput} 
                    />
                    <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                      Si el stock cae por debajo de este valor, se reserva stock en otros canales.
                    </span>
                  </div>

                  <div className={styles.formGroup} style={{ marginTop: '12px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                      <input type="checkbox" defaultChecked={selectedConnector.config.autoPauseStock} />
                      Pausar automáticamente publicaciones si el stock disponible es menor al buffer.
                    </label>
                  </div>
                </>
              )}
            </div>

            <div className={styles.drawerFooter}>
              <button 
                className={styles.btnAction} 
                onClick={() => setSelectedConnector(null)}
              >
                Cancelar
              </button>
              <button 
                className={styles.btnPrimary}
                onClick={() => {
                  alert(`Ajustes guardados para ${selectedConnector.name}. Sincronización actualizada.`);
                  setSelectedConnector(null);
                }}
              >
                Guardar Ajustes
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
