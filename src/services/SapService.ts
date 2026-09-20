import { IntegrationService } from './IntegrationService';

export interface SapCredentials {
  serviceLayerUrl: string;
  companyDB: string;
  userName: string;
  password: string;
}

export class SapService {
  /**
   * Conector oficial para SAP Business One Service Layer / OData API.
   */
  static async testConnection(workspaceId: string, credentials: SapCredentials) {
    if (!credentials.serviceLayerUrl || !credentials.companyDB || !credentials.userName) {
      return {
        success: false,
        message: 'Servidor u OData URL no especificado. Estado: Pendiente de configuración.',
      };
    }

    try {
      const res = await fetch(`${credentials.serviceLayerUrl.replace(/\/$/, '')}/Login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          CompanyDB: credentials.companyDB,
          UserName: credentials.userName,
          Password: credentials.password,
        }),
      });

      if (!res.ok) {
        throw new Error(`Error de autenticación SAP Service Layer: ${res.statusText}`);
      }

      await IntegrationService.logIntegrationEvent(
        workspaceId,
        credentials.userName,
        'SAP Business One',
        'EXITOSO',
        `Conexión establecida con la base de datos ${credentials.companyDB}.`
      );

      return { success: true, message: 'Conexión a SAP Service Layer verificada exitosamente.' };
    } catch (err: any) {
      await IntegrationService.logIntegrationEvent(
        workspaceId,
        credentials.userName || 'sistema@inventa.ai',
        'SAP Business One',
        'ERROR',
        err.message
      );
      return { success: false, message: `Error al conectar con SAP: ${err.message}` };
    }
  }
}
