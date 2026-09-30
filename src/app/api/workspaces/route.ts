import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { WorkspaceService } from '@/services/WorkspaceService';
import { SessionManager } from '@/lib/session';

import { requireWorkspace } from '@/lib/requireWorkspace';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireWorkspace();
    if (auth.error) return auth.error;
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

    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();
    
    // 2. Garantizar que el usuario exista en la tabla users
    let user;
    if (authenticatedId) {
      const { data } = await supabase.from('users').select('*').eq('id', authenticatedId).single();
      user = data;
    }
    if (!user && authenticatedEmail) {
      const { data } = await supabase.from('users').select('*').eq('email', authenticatedEmail).single();
      user = data;
    }
    if (!user && authenticatedEmail) {
      const id = `usr-${Date.now()}`;
      const { data: inserted } = await supabase.from('users').insert({
        id,
        name: authenticatedName,
        email: authenticatedEmail,
        avatar_url: authenticatedAvatar,
      }).select().single();
      user = inserted;
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
    const { workspace, membership } = await WorkspaceService.createWorkspace(
      user.id,
      name,
      slug,
      {
        email: user.email,
        name: user.name,
        avatar_url: user.avatar_url,
      }
    );

    // 4. El usuario ya se actualizó dentro de createWorkspace, no es necesario llamar update aquí


    // 5. Actualizar la sesión activa con el nuevo espacio
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
      workspace_id: workspace.id,
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

export async function PUT(req: NextRequest) {
  try {
    const auth = await requireWorkspace();
    if (auth.error) return auth.error;
    const nextAuthSession = await getServerSession(authOptions);
    const customSession = await SessionManager.getSession();

    const body = await req.json().catch(() => ({}));
    const { name, companyName } = body;
    const targetName = (name || companyName || '').trim();

    if (!targetName || targetName.length < 2) {
      return NextResponse.json(
        { success: false, error: 'El nombre del espacio de trabajo debe tener al menos 2 caracteres.' },
        { status: 400 }
      );
    }

    const workspaceId =
      customSession?.workspaceId ||
      (nextAuthSession?.user as any)?.workspace?.id ||
      'ws-default';

    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();
    
    // Actualizar en base de datos
    const { data: updated } = await supabase.from('workspaces').update({ name: targetName }).eq('id', workspaceId).select().single();


    // Actualizar sesión activa
    if (customSession) {
      await SessionManager.createSession({
        ...customSession,
        workspaceName: targetName,
      });
    }

    return NextResponse.json({
      success: true,
      workspace: updated || { id: workspaceId, name: targetName },
      workspaceName: targetName,
      message: 'Nombre de espacio de trabajo actualizado correctamente.',
    });
  } catch (error: any) {
    console.error('Error updating workspace:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al actualizar espacio de trabajo.' },
      { status: 500 }
    );
  }
}

