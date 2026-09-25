import { NextResponse } from 'next/server';
import { NexoMemoryService } from '@/services/NexoMemoryService';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { itemIds } = body;

    // Aquí iría la lógica real de conexión con Supabase o ERP para generar
    // las órdenes de compra en estado "borrador" (draft).
    // Por ahora simulamos un retraso de red y una respuesta exitosa.
    
    await new Promise((resolve) => setTimeout(resolve, 800)); // Simular latencia

    const poNumber = `PO-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    const processedCount = itemIds?.length || 0;

    // --- AUTO-INYECCIÓN DE MEMORIA (RAG) ---
    // Guardamos la acción para que Nexo la recuerde en la siguiente interacción
    const currentWorkspaceId = '00000000-0000-0000-0000-000000000000'; // Mock tenant
    await NexoMemoryService.storeNexoMemory({
      workspace_id: currentWorkspaceId,
      content: `El usuario generó exitosamente la orden de compra en borrador ${poNumber} para abastecer ${processedCount} productos que estaban en riesgo de quiebre de stock.`,
      metadata: { action: 'generate_po', poNumber, processedCount, source: 'system_event' }
    });

    return NextResponse.json({
      success: true,
      message: 'Órdenes de compra generadas exitosamente.',
      data: {
        processedItems: processedCount,
        status: 'draft',
        poNumber: poNumber,
      }
    });
  } catch (error) {
    console.error('[Approve Batch API Error]:', error);
    return NextResponse.json(
      { success: false, error: 'Ocurrió un error al procesar la solicitud.' },
      { status: 500 }
    );
  }
}
