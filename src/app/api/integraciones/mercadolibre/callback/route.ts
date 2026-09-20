import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SessionManager } from '@/lib/session';
import { MercadoLibreService } from '@/services/MercadoLibreService';
import { IntegrationService } from '@/services/IntegrationService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');

  if (!code) {
    return NextResponse.json({ success: false, error: 'Parámetro code ausente.' }, { status: 400 });
  }

  try {
    const customSession = await SessionManager.getSession();
    const nextAuthSession = await getServerSession(authOptions);

    const workspaceId =
      customSession?.workspaceId ||
      (nextAuthSession?.user as any)?.workspace_id ||
      'ws-default';

    const host = req.headers.get('host') || 'inventa-ai.vercel.app';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const redirectUri = `${protocol}://${host}/api/integraciones/mercadolibre/callback`;

    const tokenData = await MercadoLibreService.exchangeCodeForToken(code, redirectUri);
    await IntegrationService.storeOAuthToken(workspaceId, 'mercadolibre', {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresIn: tokenData.expires_in,
      scope: tokenData.scope,
    });

    if (tokenData.user_id) {
      await MercadoLibreService.syncItems(workspaceId, String(tokenData.user_id), tokenData.access_token);
    }

    return NextResponse.redirect(`${protocol}://${host}/dashboard/integraciones?success=mercadolibre`);
  } catch (err: any) {
    console.error('Error en callback de Mercado Libre:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
