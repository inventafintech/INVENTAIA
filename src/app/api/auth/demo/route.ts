import { NextRequest, NextResponse } from 'next/server';
import { SessionManager } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  await SessionManager.createSession({
    userId: 'usr-jose-gonzalez',
    email: 'jmgonzalez.contact@gmail.com',
    name: 'José González',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    workspaceId: 'ws-default',
    workspaceName: 'INVENTA COMERCIAL S.A.C.',
    workspaceSlug: 'inventa-comercial',
    workspaceRuc: '20601234567',
    role: 'OWNER',
  });

  const returnUrl = req.nextUrl.searchParams.get('callbackUrl') || '/panel/resumen';
  return NextResponse.redirect(new URL(returnUrl, req.url));
}
