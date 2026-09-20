import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { WorkspaceService } from '@/services/WorkspaceService';
import { SessionManager } from '@/lib/session';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // 1. Obtener sesión de NextAuth o de SessionManager institucional
    const nextAuthSession = await getServerSession(authOptions);
    const customSession = await SessionManager.getSession();

    const body = await req.json().catch(() => ({}));
    const { name, slug, userEmail: bodyEmail, userName: bodyName, userAvatar: bodyAvatar, userId: bodyUserId } = body;

    const authenticatedEmail =
      nextAuthSession?.user?.email || customSession?.email || bodyEmail;
    const authenticatedName =
      nextAuthSession?.user?.name || customSession?.name || bodyName || 'Usuario';
    const authenticatedAvatar =
      nextAuthSession?.user?.image || customSession?.avatarUrl || bodyAvatar;
    const authenticatedId =
      (nextAuthSession?.user as any)?.id || customSession?.userId || bodyUserId;

    if (!authenticatedEmail && !authenticatedId) {
      return NextResponse.json(
        {
          success: false,
          error: 'No autorizado. Debe iniciar sesión con Google para crear un espacio de trabajo.',
        },
        { status: 401 }
      );
    }

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

    // 2. Garantizar que el usuario exista en la tabla users
    let user = authenticatedId ? db.getUser(authenticatedId) : undefined;
    if (!user && authenticatedEmail) {
      user = db.getUserByEmail(authenticatedEmail);
    }
    if (!user && authenticatedEmail) {
      user = db.upsertUser({
        name: authenticatedName,
        email: authenticatedEmail,
        avatar_url: authenticatedAvatar,
      });
    }

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'No se pudo vincular la sesión del usuario. Inicia sesión nuevamente.',
        },
        { status: 400 }
      );
    }

    // 3. Ejecutar creación transaccional del espacio de trabajo
    const { workspace, membership } = WorkspaceService.createWorkspace(
      user.id,
      name,
      slug,
      {
        email: user.email,
        name: user.name,
        avatar_url: user.avatar_url,
      }
    );

    // 4. Actualizar la sesión activa con el nuevo espacio
    await SessionManager.createSession({
      userId: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatar_url,
      googleId: user.google_id,
      workspaceId: workspace.id,
      workspaceSlug: workspace.slug_url,
      workspaceName: workspace.name,
      role: membership.role,
    });

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
