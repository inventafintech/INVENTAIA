import { NextRequest, NextResponse } from 'next/server';
import { SessionManager } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  await SessionManager.destroySession();
  return NextResponse.json({ success: true, message: 'Sesión cerrada exitosamente.' });
}

export async function GET(req: NextRequest) {
  await SessionManager.destroySession();
  return NextResponse.redirect(new URL('/login', req.url));
}
