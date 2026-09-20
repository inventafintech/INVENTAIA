import { db, IntegrationLogRecord } from '@/lib/db';
import { ProviderHealthCheck } from '@/types/appShell';

export class IntegrationEngineService {
  /**
   * Registra una transacción o evento en la tabla `integration_logs`
   * Garantiza: fecha, usuario, integración, resultado, errores.
   */
  public static logTransaction(
    provider: string,
    action: string,
    result: string,
    userEmail: string = 'sistema@inventa.ai',
    errorDetails?: string,
    level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS' = errorDetails ? 'ERROR' : 'INFO'
  ): IntegrationLogRecord {
    return db.addLog(
      provider,
      level,
      action,
      result,
      userEmail,
      errorDetails
    );
  }

  /**
   * Verifica la existencia y validez de credenciales para todas las integraciones
   * Inyecta el estado "NO CONFIGURADO" / "pending_configuration" si faltan credenciales reales.
   */
  public static checkIntegrationsHealth(): {
    hasActive: boolean;
    overallStatus: 'pending_configuration' | 'active';
    statusText: string;
    providers: ProviderHealthCheck[];
  } {
    const integrations = db.getIntegrations();
    const providers: ProviderHealthCheck[] = [];

    // 1. Shopify
    const shopify = integrations.find((i) => i.provider === 'shopify');
    const shopifyToken = db.getOAuthToken('shopify');
    const shopifyValid = Boolean(
      shopify &&
      shopifyToken &&
      shopifyToken.access_token &&
      shopifyToken.shop_domain
    );

    providers.push({
      provider: 'shopify',
      name: 'Shopify Plus',
      configured: shopifyValid,
      status: shopifyValid ? 'active' : 'pending_configuration',
      statusLabel: shopifyValid ? 'Conectado' : 'NO CONFIGURADO',
      details: shopifyValid
        ? `Sincronización activa con ${shopifyToken?.shop_domain}`
        : 'Faltan credenciales OAuth (Store URL / Access Token)',
      credentialsPresent: shopifyValid,
    });

    // 2. Mercado Libre
    const meli = integrations.find((i) => i.provider === 'mercadolibre');
    const meliToken = db.getOAuthToken('mercadolibre');
    const meliValid = Boolean(
      meli &&
      meliToken &&
      meliToken.access_token &&
      meliToken.refresh_token
    );

    providers.push({
      provider: 'mercadolibre',
      name: 'Mercado Libre',
      configured: meliValid,
      status: meliValid ? 'active' : 'pending_configuration',
      statusLabel: meliValid ? 'Conectado' : 'NO CONFIGURADO',
      details: meliValid
        ? 'OAuth validado para ventas y stock'
        : 'Faltan credenciales OAuth (Access Token / Refresh Token)',
      credentialsPresent: meliValid,
    });

    // 3. SAP
    const sap = integrations.find((i) => i.provider === 'sap');
    const sapConfig = sap?.config || {};
    const sapValid = Boolean(
      sap &&
      sapConfig.baseUrl &&
      (sapConfig.apiKey || (sapConfig.username && sapConfig.password))
    );

    if (!sapValid && sap) {
      // Registrar en log según especificación técnica
      this.logTransaction(
        'SAP',
        'HEALTH_CHECK',
        'PENDIENTE',
        'sistema@inventa.ai',
        'Conector disponible. Instancia SAP no configurada.',
        'WARN'
      );
    }

    providers.push({
      provider: 'sap',
      name: 'SAP ERP',
      configured: sapValid,
      status: sapValid ? 'active' : 'pending_configuration',
      statusLabel: sapValid ? 'Conectado' : 'NO CONFIGURADO',
      details: sapValid
        ? 'Conector OData/REST enlazado'
        : 'Conector disponible. Instancia SAP no configurada.',
      credentialsPresent: sapValid,
    });

    // 4. WhatsApp Business (Meta Cloud API)
    const whatsapp = integrations.find((i) => i.provider === 'whatsapp');
    const whatsappConfig = whatsapp?.config || {};
    const whatsappToken = process.env.WHATSAPP_API_TOKEN || whatsappConfig.accessToken;
    const whatsappPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || whatsappConfig.phoneNumberId;
    const whatsappValid = Boolean(whatsappToken && whatsappPhoneId);

    providers.push({
      provider: 'whatsapp',
      name: 'WhatsApp Business',
      configured: whatsappValid,
      status: whatsappValid ? 'active' : 'pending_configuration',
      statusLabel: whatsappValid ? 'Conectado' : 'NO CONFIGURADO',
      details: whatsappValid
        ? 'Meta Cloud API configurada para notificaciones'
        : 'Meta Cloud API Token o Phone Number ID no configurados',
      credentialsPresent: whatsappValid,
    });

    // Estado global
    const hasActive = providers.some((p) => p.configured);
    const overallStatus = hasActive ? 'active' : 'pending_configuration';
    const statusText = hasActive
      ? `Sincronizado (${providers.filter((p) => p.configured).map((p) => p.name).join(', ')})`
      : 'Pendiente de configuración';

    return {
      hasActive,
      overallStatus,
      statusText,
      providers,
    };
  }
}
