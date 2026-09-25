import { NextResponse } from 'next/server';
import { NexoMemoryService } from '@/services/NexoMemoryService';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { amount, termDays } = body;

    // Aquí iría la lógica real de conexión con el proveedor financiero 
    // o el registro en Supabase de la solicitud de crédito.
    
    await new Promise((resolve) => setTimeout(resolve, 1200)); // Simular latencia de validación financiera

    const applicationId = `FIN-${Date.now().toString().slice(-6)}`;
    const reqAmount = amount || 0;
    const reqTerm = termDays || 30;

    // --- AUTO-INYECCIÓN DE MEMORIA (RAG) ---
    // Guardamos la acción financiera para que Nexo la recuerde
    const currentWorkspaceId = '00000000-0000-0000-0000-000000000000'; // Mock tenant
    await NexoMemoryService.storeNexoMemory({
      workspace_id: currentWorkspaceId,
      content: `El usuario solicitó exitosamente un financiamiento (ID: ${applicationId}) por S/ ${reqAmount.toLocaleString()} a un plazo de ${reqTerm} días para abastecimiento de inventario.`,
      metadata: { action: 'request_financing', applicationId, amount: reqAmount, termDays: reqTerm, source: 'system_event' }
    });

    return NextResponse.json({
      success: true,
      message: 'Solicitud de financiamiento enviada a evaluación.',
      data: {
        requestedAmount: reqAmount,
        term: reqTerm,
        status: 'evaluating',
        applicationId: applicationId,
      }
    });
  } catch (error) {
    console.error('[Financing Apply API Error]:', error);
    return NextResponse.json(
      { success: false, error: 'Ocurrió un error al procesar la solicitud de financiamiento.' },
      { status: 500 }
    );
  }
}
