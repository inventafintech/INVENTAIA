import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  const integrations = db.getIntegrations();
  return NextResponse.json({ integrations });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { provider, config, status } = body;

    if (!provider) {
      return NextResponse.json({ error: 'Proveedor es requerido' }, { status: 400 });
    }

    const updated = db.saveIntegration(provider, config || {}, status);
    db.addLog(
      provider.toUpperCase(),
      'INFO',
      'CONFIG_UPDATED',
      'Configuración guardada exitosamente',
      undefined,
      'admin@inventa.ai'
    );

    return NextResponse.json({ success: true, integration: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
