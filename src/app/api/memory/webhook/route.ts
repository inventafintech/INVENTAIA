import { NextResponse } from 'next/server';
import { NexoMemoryService, MemoryPayload } from '@/services/NexoMemoryService';
import { SessionManager } from '@/lib/session';

export async function POST(req: Request) {
  try {
    // Seguridad básica (en producción: verificar API Key secreta del webhook)
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.NEXO_WEBHOOK_SECRET || 'dev-secret'}`) {
      // Para desarrollo permitimos pasar si hay una sesión válida
      const session = await SessionManager.getSession().catch(() => null);
      if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const body = await req.json();
    const { workspace_id, content, metadata } = body as Partial<MemoryPayload>;

    if (!content) {
      return NextResponse.json({ error: 'El campo "content" es requerido.' }, { status: 400 });
    }

    // Mock de Workspace ID si no se provee
    const finalWorkspaceId = workspace_id || '00000000-0000-0000-0000-000000000000';

    // Insertar en la base de datos vectorial (Supabase + pgvector)
    await NexoMemoryService.storeNexoMemory({
      workspace_id: finalWorkspaceId,
      content,
      metadata: metadata || { source: 'webhook' },
    });

    return NextResponse.json({ success: true, message: 'Recuerdo consolidado en la memoria de Nexo.' });
  } catch (error: any) {
    console.error('[Memory Webhook Error]', error);
    return NextResponse.json({ error: 'Error procesando la memoria.' }, { status: 500 });
  }
}
