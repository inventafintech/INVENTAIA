import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SessionManager } from '@/lib/session';
import { ShopifyService } from '@/services/ShopifyService';
import { IntegrationService } from '@/services/IntegrationService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const shop = req.nextUrl.searchParams.get('shop');
  const code = req.nextUrl.searchParams.get('code');

  if (!shop || !code) {
    return NextResponse.json({ success: false, error: 'Parámetros shop o code ausentes.' }, { status: 400 });
  }

  try {
    const customSession = await SessionManager.getSession();
    const nextAuthSession = await getServerSession(authOptions);

    const workspaceId =
      customSession?.workspaceId ||
      (nextAuthSession?.user as any)?.workspace_id ||
      'ws-default';

    const accessToken = await ShopifyService.exchangeCodeForToken(shop, code);
    await IntegrationService.storeOAuthToken(workspaceId, 'shopify', { accessToken });
    await ShopifyService.syncProducts(workspaceId, shop, accessToken);

    const host = req.headers.get('host') || 'inventa-ai.vercel.app';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    return NextResponse.redirect(`${protocol}://${host}/dashboard/integraciones?success=shopify`);
  } catch (err: any) {
    console.error('Error en callback de Shopify:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
