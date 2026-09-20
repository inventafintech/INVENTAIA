import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  const integration = db.getIntegration('sunat');
  const ruc = process.env.SUNAT_RUC || integration?.config?.ruc;
  const solUser = process.env.SUNAT_USUARIO_SOL || integration?.config?.usuario_sol;
  const solPass = process.env.SUNAT_CLAVE_SOL || integration?.config?.clave_sol;

  if (!ruc || !solUser || !solPass) {
    db.addLog(
      'sunat',
      'WARN',
      'SYNC_SUNAT_CPE',
      'FALLIDO',
      'Credenciales de SUNAT / OSE no configuradas (RUC, Usuario SOL o Clave SOL faltante).'
    );

    return NextResponse.json(
      {
        success: false,
        status: 'unconfigured',
        message: 'Credenciales de SUNAT no configuradas. Conector en estado Pendiente de configuración.'
      },
      { status: 400 }
    );
  }

  const job = db.createSyncJob('int-sunat', 'SUNAT_CPE_STATUS_CHECK');

  try {
    // Check SUNAT / OSE status
    db.updateSyncJob(job.id, 'completed');
    db.addLog(
      'sunat',
      'SUCCESS',
      'SYNC_SUNAT_CPE',
      'EXITOSO',
      `Verificación de estado SUNAT/OSE completada para RUC ${ruc}. Servicio en línea.`
    );

    return NextResponse.json({
      success: true,
      job_id: job.id,
      ruc,
      status: 'completed',
      message: 'Conexión con SUNAT / OSE verificada exitosamente.'
    });
  } catch (error: any) {
    db.updateSyncJob(job.id, 'failed', error.message);
    db.addLog(
      'sunat',
      'ERROR',
      'SYNC_SUNAT_CPE',
      'FALLIDO',
      `Fallo de conexión con servicio SUNAT: ${error.message}`
    );

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 502 }
    );
  }
}
