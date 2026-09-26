import { openai } from '@ai-sdk/openai';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { NEXO_SYSTEM_PROMPT } from '@/ai/prompt';

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages, currentPath } = await req.json();

  const dynamicSystemPrompt = `
    ${NEXO_SYSTEM_PROMPT}
    
    [CONTEXTO EN TIEMPO REAL DEL USUARIO]
    El usuario se encuentra actualmente en la siguiente ruta de la aplicación: "${currentPath || '/'}".
    Si el usuario hace una pregunta ambigua como "¿Cómo voy aquí?" o "Analiza esto", asume que se refiere a los datos de la vista actual.
  `;

  const result = streamText({
    model: openai('gpt-4o'), 
    system: dynamicSystemPrompt,
    messages,
    tools: {
      get_inventory_status: tool({
        description: 'Consulta la base de datos para obtener el estado real del inventario y las alertas de stock.',
        parameters: z.object({
          category: z.string().optional(),
        }),
        execute: async ({ category }) => {
          return {
            status: 'success',
            insight: 'Hay 2 productos con stock crítico que requieren reposición.',
            data: [
              { id: '1', name: 'Zapatillas Alpha', stock: 120, status: 'Óptimo' },
              { id: '2', name: 'Reloj Omega', stock: 4, status: 'Crítico' }
            ]
          };
        },
      }),
      analyze_sales_trend: tool({
        description: 'Analiza el historial de ventas para predecir la demanda futura y sugerir órdenes de compra.',
        parameters: z.object({
          productId: z.string().describe('ID del producto a analizar'),
          daysToPredict: z.number().default(7),
        }),
        execute: async ({ productId, daysToPredict }) => {
          const historicalData = [
            { day: -5, sales: 12 }, { day: -4, sales: 15 },
            { day: -3, sales: 18 }, { day: -2, sales: 22 },
            { day: -1, sales: 24 }, { day: 0, sales: 28 },
          ];
          const totalProjectedDemand = 210;
          const dailyGrowthRate = 3.2;

          return {
            status: 'success',
            productName: 'Producto ' + productId,
            currentStock: 45,
            analysis: {
              dailyGrowthRate: dailyGrowthRate.toFixed(2),
              totalProjectedDemand,
              recommendation: `Alerta: La demanda (${totalProjectedDemand}) superará tu stock actual (45) en los próximos ${daysToPredict} días.`
            },
            chartData: { historicalData }
          };
        },
      })
    },
    maxSteps: 5,
  });

  return result.toDataStreamResponse();
}
