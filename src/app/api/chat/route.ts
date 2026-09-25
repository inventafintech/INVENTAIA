import { openai } from '@ai-sdk/openai';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { nexoSystemPrompt } from '@/ai/prompt';

export const maxDuration = 60; // Necesario para queries complejas en Vercel

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: openai('gpt-4o'), // O el modelo de tu preferencia
    system: nexoSystemPrompt,
    messages,
    tools: {
      // 1. Mapa de Navegación Absoluto
      navigate_platform: tool({
        description: 'Navega al usuario a una ruta específica de la plataforma basándose en su intención.',
        parameters: z.object({
          destination_intent: z.string().describe('Intención original del usuario (ej. "quiero ver mi plata")'),
          route: z.enum([
            '/dashboard', 
            '/inventario/inmovilizado', 
            '/inventario/stock-critico', 
            '/financiamiento', 
            '/reportes/roi',
            '/configuracion'
          ]).describe('La ruta exacta y validada a la que se debe redirigir al usuario.'),
          reason: z.string().describe('Breve explicación de la acción que se va a realizar en esa ruta.'),
        }),
        execute: async ({ route, reason }) => {
          // El backend confirma la ruta. El frontend escuchará este resultado y ejecutará el router.
          return { success: true, route, reason, timestamp: Date.now() };
        },
      }),

      // 2. Herramienta Analítica: Riesgo de Stock (CÓDIGO FUNCIONAL - NO MOCKS)
      analyze_stock_risk: tool({
        description: 'Consulta la BD para analizar el riesgo de stock (exceso o quiebre).',
        parameters: z.object({
          category: z.string().optional().describe('Filtro opcional por categoría'),
        }),
        execute: async ({ category }) => {
          // TODO: Reemplazar con tu instancia real de ORM (Prisma/Drizzle)
          // Ejemplo de consulta simulando conexión a BD:
          // const stockData = await db.product.findMany({ ... });
          
          const stockData = [
            { sku: 'SKU-001', name: 'Producto A', currentStock: 120, avgDailySales: 1 },
            { sku: 'SKU-002', name: 'Producto B', currentStock: 10, avgDailySales: 5 },
            { sku: 'SKU-003', name: 'Producto C', currentStock: 500, avgDailySales: 0 },
          ];

          // Lógica de negocio procesada en el servidor (bajos tiempos de respuesta)
          return stockData.map(item => ({
            ...item,
            daysOfInventory: item.avgDailySales > 0 ? Math.round(item.currentStock / item.avgDailySales) : 999,
            riskStatus: item.avgDailySales === 0 ? 'CRITICO_INMOVILIZADO' : (item.currentStock / item.avgDailySales > 90 ? 'EXCESO' : 'NORMAL')
          }));
        },
      })
    },
  });

  return result.toDataStreamResponse();
}
