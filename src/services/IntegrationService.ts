import { createClient } from '@/utils/supabase/server';

export interface IntegrationChannelStatus {
  provider: string;
  name: string;
  status: 'PENDING_CONFIG' | 'ACTIVE' | 'ERROR' | 'DISCONNECTED';
  statusLabel: string;
  lastSyncedAt: string | null;
  config: Record<string, any>;
}

export class IntegrationService {
  /**
   * Obtiene la lista completa de canales de integración con su estado real.
   * Regla de Negocio Estricta: Si no existe un token OAuth válido o configuración verificada,
   * el estado debe ser estrictamente 'PENDING_CONFIG' ("Pendiente de configuración").
   */
  static async getAllIntegrations(workspaceId: string): Promise<IntegrationChannelStatus[]> {
    const supabase = await createClient();

    // 1. Consultar integraciones y tokens registrados en Supabase
    const { data: dbIntegrations } = await supabase
      .from('integrations')
      .select('*')
      .eq('workspace_id', workspaceId);

    const { data: dbTokens } = await supabase
      .from('oauth_tokens')
      .select('provider, expires_at, created_at')
      .eq('workspace_id', workspaceId);

    const integrationMap = new Map((dbIntegrations || []).map((item) => [item.provider, item]));
    const tokenMap = new Map((dbTokens || []).map((token) => [token.provider, token]));

    // Definición canónica de los 5 canales empresariales
    const channels = [
      { provider: 'shopify', name: 'Shopify Storefront & Admin API' },
      { provider: 'mercadolibre', name: 'Mercado Libre Marketplace API' },
      { provider: 'whatsapp', name: 'Meta WhatsApp Business Cloud API' },
      { provider: 'sap', name: 'SAP Business One / S4HANA OData' },
      { provider: 'sunat', name: 'SUNAT Facturación Electrónica' },
    ];

    return channels.map((channel) => {
      const dbItem = integrationMap.get(channel.provider);
      const tokenItem = tokenMap.get(channel.provider);

      let status: 'PENDING_CONFIG' | 'ACTIVE' | 'ERROR' | 'DISCONNECTED' = 'PENDING_CONFIG';
      let statusLabel = 'Pendiente de configuración';

      // Verificar si hay un token u objeto activo real
      if (tokenItem || (dbItem && dbItem.status === 'ACTIVE')) {
        status = 'ACTIVE';
        statusLabel = 'Activo y Conectado';
      } else if (dbItem?.status === 'ERROR') {
        status = 'ERROR';
        statusLabel = 'Error de Sincronización';
      }

      return {
        provider: channel.provider,
        name: channel.name,
        status,
        statusLabel,
        lastSyncedAt: dbItem?.last_synced_at || tokenItem?.created_at || null,
        config: dbItem?.config || {},
      };
    });
  }

  /**
   * Guarda o actualiza un token OAuth obtenido mediante flujo OAuth 2.0 real.
   */
  static async storeOAuthToken(
    workspaceId: string,
    provider: string,
    tokenData: {
      accessToken: string;
      refreshToken?: string;
      expiresIn?: number;
      scope?: string;
    }
  ) {
    const supabase = await createClient();
    const expiresAt = tokenData.expiresIn
      ? new Date(Date.now() + tokenData.expiresIn * 1000).toISOString()
      : null;

    // 1. Upsert token en oauth_tokens
    const { error: tokenError } = await supabase.from('oauth_tokens').upsert(
      {
        id: `tok-${workspaceId}-${provider}`,
        workspace_id: workspaceId,
        provider,
        access_token: tokenData.accessToken,
        refresh_token: tokenData.refreshToken || null,
        expires_at: expiresAt,
        scope: tokenData.scope || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'workspace_id,provider' }
    );

    if (tokenError) {
      throw new Error(`Error al guardar token de ${provider}: ${tokenError.message}`);
    }

    // 2. Marcar integración como ACTIVE en la tabla integrations
    await supabase.from('integrations').upsert(
      {
        id: `int-${workspaceId}-${provider}`,
        workspace_id: workspaceId,
        provider,
        name: provider.toUpperCase(),
        status: 'ACTIVE',
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'workspace_id,provider' }
    );
  }

  /**
   * Auditoría de eventos de integración en la tabla integration_logs.
   */
  static async logIntegrationEvent(
    workspaceId: string,
    userEmail: string,
    integracion: string,
    resultado: 'EXITOSO' | 'ERROR' | 'PENDIENTE',
    errores?: string
  ) {
    const supabase = await createClient();
    await supabase.from('integration_logs').insert({
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      usuario: userEmail || 'sistema@inventa.ai',
      integracion,
      resultado,
      errores: errores || null,
      fecha: new Date().toISOString(),
    });
  }
}
