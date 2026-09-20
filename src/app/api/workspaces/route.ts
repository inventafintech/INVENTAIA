import { NextRequest, NextResponse } from 'next/server';
import { WorkspaceService } from '@/services/WorkspaceService';
import { SessionManager } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await SessionManager.getSession();

    if (!session || !session.userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'No autorizado. Debe iniciar sesión con Google para crear un espacio de trabajo.',
        },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { name, slug } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { success: false, error: 'El nombre de la empresa es requerido.' },
        { status: 400 }
      );
    }

    if (!slug || typeof slug !== 'string') {
      return NextResponse.json(
        { success: false, error: 'La dirección del espacio de trabajo (slug) es requerida.' },
        { status: 400 }
      );
    }

    // Ejecutar creación transaccional
    const { workspace, membership } = WorkspaceService.createWorkspace(
      session.userId,
      name,
      slug
    );

    // Actualizar la sesión activa con el nuevo espacio
    await SessionManager.updateSessionWorkspace(
      workspace.id,
      workspace.slug_url,
      workspace.name,
      membership.role
    );

    return NextResponse.json({
      success: true,
      workspace,
      membership,
      redirectUrl: '/dashboard',
    });
  } catch (error: any) {
    console.error('Error creating workspace:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al crear el espacio de trabajo.',
      },
      { status: 400 }
    );
  }
}
