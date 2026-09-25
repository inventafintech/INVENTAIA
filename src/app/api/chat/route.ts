import { openai } from '@ai-sdk/openai';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { nexoSystemPrompt } from '@/ai/prompt';
import { SessionManager } from '@/lib/session';
import { NexoEngineService, resolveNavigation, hasNavVerb } from '@/services/NexoEngineService';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const messages = Array.isArray(body?.messages) ? body.messages : [];
    const pathname = typeof body?.pathname === 'string' ? body.pathname : '';

    const lastMsg = messages[messages.length - 1];
    const userMessage = typeof lastMsg?.content === 'string' ? lastMsg.content.trim() : '';

    const session = await SessionManager.getSession().catch(() => null);
    const email = session?.email || 'sistema@inventa.ai';

    // 1. Si está configurada la API KEY de OpenAI, usamos streamText con herramientas reales conectadas al ERP
    if (process.env.OPENAI_API_KEY) {
      try {
        const result = await streamText({
          model: openai(process.env.OPENAI_MODEL || 'gpt-4o'),
          system: nexoSystemPrompt,
          messages,
          tools: {
            navigate_platform: tool({
              description: 'Navega al usuario a una pantalla o módulo específico de INVENTA.AI.',
              parameters: z.object({
                destination_intent: z.string().describe('Intención de navegación del usuario'),
                route: z.string().describe('Ruta relativa validada (ej. /stock-alerts, /products/products, /inventory/inventory-items, /dashboard/integraciones)'),
                reason: z.string().describe('Motivo breve de la redirección'),
              }),
              execute: async ({ route, reason }) => {
                return { success: true, route, reason, timestamp: Date.now() };
              },
            }),

            analyze_stock_risk: tool({
              description: 'Consulta datos reales de inventario y calcula los SKUs en quiebre o riesgo crítico.',
              parameters: z.object({
                category: z.string().optional().describe('Categoría opcional'),
              }),
              execute: async () => {
                const queryRes = await NexoEngineService.query('quiebres stock crítico', pathname, email);
                return {
                  items: queryRes.cards || [],
                  summary: queryRes.reply,
                };
              },
            }),

            calculate_financing: tool({
              description: 'Calcula necesidad de capital de trabajo y opciones de financiamiento de inventario.',
              parameters: z.object({
                amount: z.number().optional().describe('Monto a simular'),
              }),
              execute: async ({ amount }) => {
                const queryRes = await NexoEngineService.query(
                  amount ? `financia ${amount}` : 'financiamiento capital',
                  pathname,
                  email
                );
                return {
                  cards: queryRes.cards || [],
                  summary: queryRes.reply,
                };
              },
            }),
          },
        });

        return result.toDataStreamResponse();
      } catch (aiErr) {
        console.warn('OpenAI stream failed, falling back to NexoEngineService:', aiErr);
      }
    }

    // 2. Fallback determinista y resiliente con NexoEngineService (100% CÓDIGO FUNCIONAL - DATOS REALES DE SUPABASE)
    const nexoRes = await NexoEngineService.query(userMessage, pathname, email);
    const replyText = nexoRes.reply || 'He procesado tu solicitud sobre las métricas actuales.';

    // Creamos un stream compatible con el protocolo Vercel AI SDK DataStream (partes 0:, 9:, a:, d:)
    const encoder = new TextEncoder();
    const customStream = new ReadableStream({
      async start(controller) {
        // Enviar respuesta en chunks para efecto de streaming en vivo
        const words = replyText.split(' ');
        for (let i = 0; i < words.length; i += 3) {
          const chunk = words.slice(i, i + 3).join(' ') + (i + 3 < words.length ? ' ' : '');
          controller.enqueue(encoder.encode(`0:${JSON.stringify(chunk)}\n`));
          await new Promise((r) => setTimeout(r, 20));
        }

        // Si hay navegación directa
        if (hasNavVerb(userMessage)) {
          const dest = resolveNavigation(userMessage);
          if (dest) {
            const toolCallId = `call_${Date.now()}`;
            controller.enqueue(
              encoder.encode(
                `9:${JSON.stringify({
                  toolCallId,
                  toolName: 'navigate_platform',
                  args: { route: dest.href, reason: `Navegando a ${dest.label}`, destination_intent: userMessage },
                })}\n`
              )
            );
            controller.enqueue(
              encoder.encode(
                `a:${JSON.stringify({
                  toolCallId,
                  result: { success: true, route: dest.href, label: dest.label },
                })}\n`
              )
            );
          }
        }

        // Si hay tarjetas generativas (SKUs, finanzas, órdenes de compra), enviamos tool invocation generativa
        if (nexoRes.cards && nexoRes.cards.length > 0) {
          const toolCallId = `cards_${Date.now()}`;
          controller.enqueue(
            encoder.encode(
              `9:${JSON.stringify({
                toolCallId,
                toolName: 'generative_cards',
                args: { count: nexoRes.cards.length },
              })}\n`
            )
          );
          controller.enqueue(
            encoder.encode(
              `a:${JSON.stringify({
                toolCallId,
                result: { cards: nexoRes.cards, intent: nexoRes.intent },
              })}\n`
            )
          );
        }

        // Fin de mensaje
        controller.enqueue(
          encoder.encode(
            `d:${JSON.stringify({ finishReason: 'stop', usage: { promptTokens: 20, completionTokens: 80 } })}\n`
          )
        );
        controller.close();
      },
    });

    return new Response(customStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Vercel-AI-Data-Stream': 'v1',
      },
    });
  } catch (error: any) {
    console.error('Error en POST /api/chat:', error);
    return new Response(
      `0:${JSON.stringify('Lo siento, ocurrió un error temporal al procesar tu consulta.')}\nd:{"finishReason":"error"}\n`,
      {
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Vercel-AI-Data-Stream': 'v1' },
      }
    );
  }
}
