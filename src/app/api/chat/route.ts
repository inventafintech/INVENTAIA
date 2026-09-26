import { google } from '@ai-sdk/google';
import { streamText, tool, isStepCount } from 'ai';
import { z } from 'zod';
import { NEXO_SYSTEM_PROMPT } from '@/ai/prompt';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { InventoryMasterService } from '@/services/InventoryMasterService';
import { NexoMemoryService } from '@/services/NexoMemoryService';

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages, currentPath } = await req.json();
  const session = await getServerSession(authOptions);
  
  const targetWorkspaceId = (session?.user as any)?.workspace_id || 'ws-default';
  
  // Extraer el último mensaje del usuario para hacer RAG vectorial
  const lastMessage = messages.filter((m: any) => m.role === 'user').pop()?.content || '';
  
  let memoryContext = '';
  if (lastMessage) {
    const memories = await NexoMemoryService.retrieveRelevantMemories(lastMessage, targetWorkspaceId);
    if (memories.length > 0) {
      memoryContext = `[MEMORIA INSTITUCIONAL Y CONTEXTO HISTÓRICO RAG]\n` + memories.map(m => `- ${m.content} (Similitud: ${m.similarity.toFixed(2)})`).join('\n');
    }
  }

  const dynamicSystemPrompt = `
${NEXO_SYSTEM_PROMPT}

[CONTEXTO EN TIEMPO REAL DEL USUARIO]
El usuario se encuentra actualmente en la siguiente ruta de la aplicación: "${currentPath || '/'}".
Si el usuario hace una pregunta ambigua como "¿Cómo voy aquí?" o "Analiza esto", asume que se refiere a los datos de la vista actual.

${memoryContext}
  `;

  const result = streamText({
    model: google((process.env.GEMINI_MODEL || 'gemini-3.8-flash').replace(/[^a-zA-Z0-9.-]/g, '')),
    stopWhen: isStepCount(5),
    instructions: dynamicSystemPrompt,
    messages,
    tools: {
      get_inventory_status: tool({
        description: 'Consulta la base de datos para obtener el estado real del inventario y las alertas de stock.',
        inputSchema: z.object({
          category: z.string().optional(),
        }),
        execute: async ({ category }) => {
          const items = await InventoryMasterService.getInventoryItems();
          
          let filtered = items;
          if (category) {
            filtered = items.filter((i: any) => i.category.toLowerCase().includes(category.toLowerCase()));
          }
          
          const criticos = filtered.filter((i: any) => i.health === 'low' || i.healthLabel === 'Stock Bajo');
          
          return {
            status: 'success',
            insight: `Hay ${criticos.length} productos con stock crítico que requieren reposición.`,
            data: criticos.slice(0, 5).map((i: any) => ({
              id: i.id,
              name: i.name,
              stock: i.physicalStock,
              status: i.healthLabel
            }))
          };
        },
      }),
      analyze_sales_trend: tool({
        description: 'Analiza el historial para predecir la demanda futura y sugerir órdenes de compra, sin inventar datos.',
        inputSchema: z.object({
          productId: z.string().describe('ID o nombre del producto a analizar'),
          daysToPredict: z.number().default(7),
        }),
        execute: async ({ productId, daysToPredict }) => {
          const items = await InventoryMasterService.getInventoryItems();
          const producto = items.find((i: any) => i.id === productId || i.name.toLowerCase().includes(productId.toLowerCase()));
          
          if (!producto) {
             return { status: 'error', message: 'Producto no encontrado en la base de datos real.' };
          }
          
          return {
            status: 'success',
            productName: producto.name,
            currentStock: producto.physicalStock,
            analysis: {
              recommendation: `Stock actual de ${producto.name} es ${producto.physicalStock} con un nivel de seguridad de ${producto.safetyStock}. Si la demanda continúa, necesitarás reabastecer.`
            }
          };
        },
      })
    },
  });

  return result.toTextStreamResponse();
}
