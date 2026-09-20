import { NextResponse } from 'next/server';
import { SessionManager } from '@/lib/session';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await SessionManager.getSession();

    if (!session) {
      return NextResponse.json({
        authenticated: false,
        user: null,
        workspace: null,
      });
    }

    const user = db.getUser(session.userId);
    const workspace = session.workspaceId ? db.getWorkspace(session.workspaceId) : null;

    return NextResponse.json({
      authenticated: true,
      user: {
        id: session.userId,
        email: session.email,
        name: session.name,
        avatar_url: session.avatarUrl || user?.avatar_url || null,
        role: session.role || null,
      },
      workspace: workspace
        ? {
            id: workspace.id,
            name: workspace.name,
            slug_url: workspace.slug_url,
          }
        : null,
    });
  } catch (error: any) {
    console.error('Error fetching session:', error);
    return NextResponse.json(
      { authenticated: false, error: error.message || 'Error al obtener sesión' },
      { status: 500 }
    );
  }
}
