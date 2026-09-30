import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SessionManager } from '@/lib/session';

export interface AuthContext {
  workspaceId: string;
  email: string;
}

/**
 * requireWorkspace — puerta única de autenticación para mutaciones.
 * 401 si no hay sesión NextAuth ni cookie institucional firmada.
 * Con sesión, resuelve el workspace igual que antes (incluido el fallback
 * al primer workspace para usuarios autenticados sin workspace vinculado).
 * Uso: const auth = await requireWorkspace(); if (auth.error) return auth.error;
 */
export async function requireWorkspace(): Promise<
  { ctx: AuthContext; error?: undefined } | { ctx?: undefined; error: NextResponse }
> {
  const [custom, nextAuth] = await Promise.all([
    SessionManager.getSession().catch(() => null),
    getServerSession(authOptions).catch(() => null),
  ]);

  const email =
    custom?.email || nextAuth?.user?.email || null;

  if (!custom && !nextAuth) {
    return {
      error: NextResponse.json(
        { success: false, error: 'No autenticado. Inicia sesión para continuar.' },
        { status: 401 }
      ),
    };
  }

  const sessionWs =
    custom?.workspaceId && custom.workspaceId !== 'ws-default'
      ? custom.workspaceId
      : ((nextAuth?.user as any)?.workspace_id as string | undefined);

  const { createClient } = await import('@/utils/supabase/server');
  const supabase = await createClient();

  if (sessionWs) {
    const { data } = await supabase
      .from('workspaces')
      .select('id')
      .eq('id', sessionWs)
      .maybeSingle();
    if (data?.id) return { ctx: { workspaceId: data.id, email: email as string } };
  }

  const { data: first } = await supabase
    .from('workspaces')
    .select('id')
    .limit(1)
    .maybeSingle();
  if (!first?.id) {
    return {
      error: NextResponse.json(
        { success: false, error: 'Sin workspace disponible.' },
        { status: 404 }
      ),
    };
  }
  return { ctx: { workspaceId: first.id, email: email as string } };
}
