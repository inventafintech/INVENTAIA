import { NextRequest, NextResponse } from 'next/server';
import { ADDONS } from '@/lib/addons';

export const dynamic = 'force-dynamic';

/**
 * POST /api/billing/checkout { addonId, cycle }
 * Compra directa vía Stripe Checkout. Requiere STRIPE_SECRET_KEY y Price ID
 * configurado en el complemento; si no, 409 con flujo sales-led.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const addonId = typeof body?.addonId === 'string' ? body.addonId : '';
    const cycle = body?.cycle === 'anual' ? 'anual' : 'mensual';

    const addon = ADDONS.find((a) => a.id === addonId);
    if (!addon) {
      return NextResponse.json({ error: 'Complemento inexistente.' }, { status: 404 });
    }

    const secretKey = process.env.STRIPE_SECRET_KEY;
    const priceId = cycle === 'anual' ? addon.stripeAnnualPriceId || addon.stripePriceId : addon.stripePriceId;
    if (!secretKey || !priceId) {
      return NextResponse.json(
        {
          error: 'Compra de autoservicio no configurada en este entorno. Contacta con ventas.',
          code: 'SALES_LED',
        },
        { status: 409 }
      );
    }

    const { default: Stripe } = await import('stripe');
    const stripe = new Stripe(secretKey);

    const host = req.headers.get('host') || 'inventa-ia.vercel.app';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${protocol}://${host}/addons?checkout=success&addon=${addon.id}`,
      cancel_url: `${protocol}://${host}/addons?checkout=cancelled`,
      metadata: { addonId: addon.id, cycle },
    });

    return NextResponse.json({ success: true, url: session.url });
  } catch (error: any) {
    console.error('Error en POST billing/checkout:', error);
    return NextResponse.json({ error: 'No se pudo iniciar el checkout.' }, { status: 500 });
  }
}
