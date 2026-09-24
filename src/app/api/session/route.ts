import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SessionManager } from '@/lib/session';
import { db } from '@/lib/db';
import { parseDevice } from '@/lib/currentUser';
import { readTwoFactorState } from '@/lib/twoFactorStore';

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
    
    let user: any = null;
    {
      const { data } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
      user = data || null;
    }
    if (!user && email) {
      const { data } = await supabase.from('users').select('*').eq('email', email).maybeSingle();
      user = data || null;
    }
    // La BD es la fuente de verdad del avatar para que los cambios del perfil
    // se reflejen al instante en header y dropdowns sin recargar.
    const avatarUrl = user?.avatar_url || session?.avatarUrl || nextAuthSession?.user?.image || null;

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
        phone: (user as any)?.phone ?? null,
        position: (user as any)?.position ?? null,
        language: (user as any)?.language ?? null,
        timezone: (user as any)?.timezone ?? null,
        provider: user?.google_id ? 'google' : 'credentials',
        has_password: Boolean((user as any)?.password_hash),
        two_factor_enabled: Boolean(readTwoFactorState(user)?.enabled),
      },
      session: session
        ? {
            provider: user?.google_id ? 'google' : 'credentials',
            device: parseDevice((await headers()).get('user-agent')),
            loginAt: new Date(session.createdAt).toISOString(),
            expiresAt: new Date(session.createdAt + 14 * 24 * 60 * 60 * 1000).toISOString(),
          }
        : null,
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
