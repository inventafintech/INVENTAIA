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

    // Respaldo real: credenciales en settings JSONB (tablas aún no migradas)
    let settingsAuth: Record<string, any> = {};
    try {
      const { data: ws } = await supabase.from('workspaces').select('settings').eq('id', workspaceId).maybeSingle();
      settingsAuth = (ws?.settings as Record<string, any>) || {};
    } catch {
      settingsAuth = {};
    }

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

      // Verificar si hay un token u objeto activo real (tabla o settings JSONB)
      if (tokenItem || settingsAuth[`oauth_${channel.provider}`]?.access_token || (dbItem && dbItem.status === 'ACTIVE')) {
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
   * Guarda credenciales OAuth de un proveedor. Destino real: settings JSONB del
   * workspace (columna existente). Las tablas oauth_tokens/integrations se
   * intentan como mejor esfuerzo para cuando se aplique la migración completa.
   */
  static async saveProviderAuth(
    workspaceId: string,
    provider: string,
    auth: {
      accessToken: string;
      refreshToken?: string | null;
      expiresIn?: number | null;
      scope?: string | null;
      userId?: string | null;
      config?: Record<string, any>;
    }
  ): Promise<void> {
    const supabase = await createClient();
    const expiresAt = auth.expiresIn
      ? new Date(Date.now() + auth.expiresIn * 1000).toISOString()
      : null;

    // 1. Store real: settings del workspace (merge, nunca sobrescribir todo)
    try {
      const { data: ws } = await supabase.from('workspaces').select('settings').eq('id', workspaceId).maybeSingle();
      const current = (ws?.settings as Record<string, any>) || {};
      const merged = {
        ...current,
        [`oauth_${provider}`]: {
          access_token: auth.accessToken,
          refresh_token: auth.refreshToken || null,
          expires_at: expiresAt,
          scope: auth.scope || null,
          user_id: auth.userId || null,
          updated_at: new Date().toISOString(),
        },
        ...(auth.config ? { [`config_${provider}`]: { ...(current[`config_${provider}`] || {}), ...auth.config } } : {}),
      };
      await supabase.from('workspaces').update({ settings: merged }).eq('id', workspaceId);
    } catch (err) {
      console.error(`No se pudo persistir auth de ${provider} en settings:`, err);
    }

    // 2. Mejor esfuerzo: tablas dedicadas (si la migración está aplicada)
    try {
      await supabase.from('oauth_tokens').upsert(
        {
          id: `tok-${workspaceId}-${provider}`,
          workspace_id: workspaceId,
          provider,
          access_token: auth.accessToken,
          refresh_token: auth.refreshToken || null,
          expires_at: expiresAt,
          scope: auth.scope || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'workspace_id,provider' }
      );
    } catch {
      // Tabla aún no creada: el estado vive en settings (ver getProviderAuth)
    }
    try {
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
    } catch {
      // Tabla aún no creada: el estado vive en settings
    }
  }

  /**
   * Lee credenciales: tabla oauth_tokens → settings JSONB. Nunca falla:
   * retorna null si no hay nada configurado (Pendiente de configuración).
   */
  static async getProviderAuth(
    workspaceId: string,
    provider: string
  ): Promise<{
    accessToken?: string;
    refreshToken?: string | null;
    expiresAt?: string | null;
    userId?: string | null;
    config: Record<string, any>;
    source: 'table' | 'settings' | null;
  }> {
    const supabase = await createClient();
    try {
      const { data: tok } = await supabase
        .from('oauth_tokens')
        .select('access_token,refresh_token,expires_at')
        .eq('workspace_id', workspaceId)
        .eq('provider', provider)
        .maybeSingle();
      if (tok?.access_token) {
        const { data: integ } = await supabase
          .from('integrations')
          .select('config')
          .eq('workspace_id', workspaceId)
          .eq('provider', provider)
          .maybeSingle();
        return {
          accessToken: tok.access_token,
          refreshToken: tok.refresh_token,
          expiresAt: tok.expires_at,
          config: (integ?.config as Record<string, any>) || {},
          source: 'table',
        };
      }
    } catch {
      // Tablas aún no creadas: continuar con settings
    }
    try {
      const { data: ws } = await supabase.from('workspaces').select('settings').eq('id', workspaceId).maybeSingle();
      const settings = (ws?.settings as Record<string, any>) || {};
      const stored = settings[`oauth_${provider}`];
      if (stored?.access_token) {
        return {
          accessToken: stored.access_token,
          refreshToken: stored.refresh_token,
          expiresAt: stored.expires_at,
          userId: stored.user_id,
          config: settings[`config_${provider}`] || {},
          source: 'settings',
        };
      }
    } catch (err) {
      console.error(`Error al leer auth de ${provider}:`, err);
    }
    return { config: {}, source: null };
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
    // Delegar al store real (settings JSONB + tablas como mejor esfuerzo)
    await this.saveProviderAuth(workspaceId, provider, {
      accessToken: tokenData.accessToken,
      refreshToken: tokenData.refreshToken,
      expiresIn: tokenData.expiresIn,
      scope: tokenData.scope,
    });
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
