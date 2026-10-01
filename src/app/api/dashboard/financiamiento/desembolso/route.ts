import { NextRequest, NextResponse } from 'next/server';
import { FinancingService } from '@/services/FinancingService';
import { requireWorkspace } from '@/lib/requireWorkspace';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireWorkspace();
    if (auth.error) return auth.error;
    const body = await req.json();
    const { amount, termDays } = body;
    const userEmail = auth.ctx.email;

    if (!amount || !termDays) {
      return NextResponse.json(
        { success: false, error: 'Monto y plazo de pago son campos obligatorios.' },
        { status: 400 }
      );
    }

    const result = await FinancingService.requestDisbursement(
      Number(amount),
      Number(termDays),
      userEmail
    );

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Error al procesar solicitud de desembolso' },
      { status: 500 }
    );
  }
}
