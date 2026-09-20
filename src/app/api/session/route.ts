import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SessionManager } from '@/lib/session';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await SessionManager.getSession();
    const nextAuthSession = await getServerSession(authOptions);

    if (!session && !nextAuthSession) {
      return NextResponse.json({
        authenticated: false,
        user: null,
        workspace: null,
      });
    }

    const userId = session?.userId || (nextAuthSession?.user as any)?.id || 'usr-default';
    const email = session?.email || nextAuthSession?.user?.email || '';
    const name = session?.name || nextAuthSession?.user?.name || 'Usuario';
    
    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();
    
    const { data: user } = await supabase.from('users').select('*').eq('id', userId).single();
    const avatarUrl = session?.avatarUrl || nextAuthSession?.user?.image || user?.avatar_url || null;

    const workspaceId =
      session?.workspaceId ||
      (nextAuthSession?.user as any)?.workspace?.id ||
      'ws-default';

    let workspace;
    if (workspaceId !== 'ws-default') {
      const { data } = await supabase.from('workspaces').select('*').eq('id', workspaceId).single();
      workspace = data;
    }
    
    workspace = workspace || {
      id: workspaceId,
      name: session?.workspaceName || (nextAuthSession?.user as any)?.workspace?.name || '',
      slug_url: session?.workspaceSlug || '',
    };

    return NextResponse.json({
      authenticated: true,
      user: {
        id: userId,
        email,
        name,
        avatar_url: avatarUrl,
        role: session?.role || 'OWNER',
      },
      workspace: {
        id: workspace.id,
        name: workspace.name,
        slug_url: workspace.slug_url,
      },
    });
  } catch (error: any) {
    console.error('Error fetching session:', error);
    return NextResponse.json(
      { authenticated: false, error: error.message || 'Error al obtener sesión' },
      { status: 500 }
    );
  }
}
