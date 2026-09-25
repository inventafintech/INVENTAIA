import { google } from '@ai-sdk/google';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { nexoSystemPrompt } from '@/ai/prompt';
import { SessionManager } from '@/lib/session';
import { NexoEngineService, resolveNavigation, hasNavVerb, isOffDomain } from '@/services/NexoEngineService';
import { NexoMemoryService } from '@/services/NexoMemoryService';

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

    // 0. Confinamiento Estricto de Dominio (Anti-Alucinaciones) a nivel API:
    // Si la consulta es ajena al ecosistema de inventario/finanzas, responder inmediatamente con la frase canónica.
    if (isOffDomain(userMessage)) {
      const refusalText = 'Mi enfoque está optimizado exclusivamente para la gestión de su inventario y operaciones en la plataforma. ¿En qué módulo operativo puedo asistirle?';
      const encoder = new TextEncoder();
      const refusalStream = new ReadableStream({
        async start(controller) {
          const words = refusalText.split(' ');
          for (let i = 0; i < words.length; i += 3) {
            const chunk = words.slice(i, i + 3).join(' ') + (i + 3 < words.length ? ' ' : '');
            controller.enqueue(encoder.encode(`0:${JSON.stringify(chunk)}\n`));
            await new Promise((r) => setTimeout(r, 20));
          }
          // Enviar tarjetas de navegación a módulos seguros
          const toolCallId = `cards_${Date.now()}`;
          const refusalCards = [
            { id: 'nav-restock', kind: 'info', title: 'Reabastecimiento Inteligente', subtitle: 'Ver análisis de cobertura y quiebres', action: { type: 'navigate', label: 'Ir a Reabastecimiento', payload: { href: '/dashboard/reabastecimiento' }, requiresConfirm: false } },
            { id: 'nav-inv', kind: 'info', title: 'Inventario de Existencias', subtitle: 'Catálogo de SKUs y Puntos de Reorden', action: { type: 'navigate', label: 'Ir a Inventario', payload: { href: '/inventory/inventory-items' }, requiresConfirm: false } },
            { id: 'nav-plans', kind: 'info', title: 'Línea de Financiamiento', subtitle: 'Línea de crédito para compras de inventario', action: { type: 'navigate', label: 'Ver Financiamiento', payload: { href: '/plans' }, requiresConfirm: false } },
          ];
          controller.enqueue(
            encoder.encode(
              `9:${JSON.stringify({ toolCallId, toolName: 'generative_cards', args: { count: refusalCards.length } })}\n`
            )
          );
          controller.enqueue(
            encoder.encode(
              `a:${JSON.stringify({ toolCallId, result: { cards: refusalCards, intent: 'help' } })}\n`
            )
          );
          controller.enqueue(
            encoder.encode(`d:${JSON.stringify({ finishReason: 'stop', usage: { promptTokens: 10, completionTokens: 30 } })}\n`)
          );
          controller.close();
        },
      });

      return new Response(refusalStream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'X-Vercel-AI-Data-Stream': 'v1',
        },
      });
    }

    // 1. Si está configurada la API KEY de Google Gemini, inyectamos contexto real del ERP y usamos streamText
    if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      try {
        const { RestockCalculatorService } = await import('@/services/RestockCalculatorService');
        const { FinancingService } = await import('@/services/FinancingService');
        const { NotificationService } = await import('@/services/NotificationService');

        // Mock de Workspace ID (En un entorno real vendría del JWT / SessionAuth)
        const currentWorkspaceId = '00000000-0000-0000-0000-000000000000';

        // Ejecución Concurrente Extrema (<150ms total)
        const [restockData, creditSummary, alertSummary, memories] = await Promise.all([
          RestockCalculatorService.calculateRestockItems().catch(() => ({ items: [], criticalCount: 0, warningCount: 0, totalCapitalRequired: 0 })),
          Promise.resolve(FinancingService.getCreditSummary()).catch(() => null),
          NotificationService.getAlertSummary().catch(() => null),
          NexoMemoryService.retrieveRelevantMemories(userMessage, currentWorkspaceId, 0.75, 3), // Búsqueda RAG (Cosine Similarity)
        ]);

        const criticalList = restockData.items.filter((i) => i.status !== 'optimal');

        // Resumen valorizado SÍNCRONO (maestro real, cero costo): fuente de
        // totalUnits/totalValue/lowCount para que el modelo nunca invente cifras.
        const invSummary = (() => {
          try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const { InventoryMasterService } = require('@/services/InventoryMasterService');
            return InventoryMasterService.getInventorySummary();
          } catch {
            return null;
          }
        })();
        const totalUnits = invSummary?.kpis.totalUnits ?? 0;
        const totalValue = invSummary?.kpis.totalValue ?? 0;
        const lowCount = invSummary?.alerts.lowStock ?? 0;
        const outOfStock = invSummary?.alerts.outOfStock ?? 0;

        const canonicalModule = pathname.startsWith('/dashboard/reabastecimiento')
          ? 'Reabastecimiento Inteligente (/dashboard/reabastecimiento)'
          : pathname.startsWith('/panel/resumen')
            ? 'Resumen de Inventario (/panel/resumen)'
            : pathname.startsWith('/dashboard/')
              ? `Dashboard (${pathname})`
              : pathname.startsWith('/inventario/')
                ? `Inventario (${pathname})`
                : `General (${pathname || '/overview'})`;
        
        // Bloque de RAG (Contexto Semántico a Largo Plazo)
        const memoryContextString = memories.length > 0 
          ? `[MEMORIA A LARGO PLAZO Y CONTEXTO HISTÓRICO]:\n${memories.map((m, i) => `Recuerdo ${i + 1}: ${m.content} (Metadata: ${JSON.stringify(m.metadata)})`).join('\n')}`
          : `[MEMORIA A LARGO PLAZO]: Sin eventos históricos relevantes para esta consulta.`;

        const realTimeContext = `
[CONTEXTO EN TIEMPO REAL DEL ERP INVENTA.AI - DATOS OPERATIVOS ACTUALES]:
- Pantalla actual del usuario: ${pathname || '/overview'}
- Módulo canónico: ${canonicalModule}
- RESUMEN MAESTRO VALORIZADO: totalUnits=${totalUnits} u | totalValue=S/ ${Number(totalValue).toLocaleString()} | lowCount=${lowCount} | outOfStock=${outOfStock} | turnover=${invSummary?.kpis.turnoverLabel ?? 'Sin movimientos'}
- Total SKUs monitoreados: ${restockData.items.length}
- SKUs en Quiebre Crítico (< 3.5 días): ${restockData.criticalCount}
- SKUs en Advertencia de Reorden: ${criticalList.length - Math.min(restockData.criticalCount, criticalList.length)}
- Capital Total Requerido para reposición: S/ ${restockData.totalCapitalRequired.toLocaleString()}
- Línea de Crédito Disponible: S/ ${creditSummary?.available_amount?.toLocaleString() || 'N/A'} (${creditSummary?.partner_bank_name || 'B2B Capital'})
- Tasa Mensual de Financiamiento: ${(((creditSummary?.monthly_interest_rate ?? 0.0145)) * 100).toFixed(2)}%
- Top SKUs Críticos en riesgo inminente:
${criticalList.slice(0, 5).map((i) => `  * SKU: ${i.sku} | Nombre: ${i.name} | Cobertura: ${i.coverageDays} días | ROP: ${i.rop} | Sugerido: ${i.suggestedQty} u | Inversión: S/ ${i.investment.toLocaleString()} | Proveedor: ${i.provider}`).join('\n')}
- Alertas del sistema: Quiebres de stock: ${alertSummary?.riesgoQuiebre ?? 0}, Órdenes pendientes: ${alertSummary?.ordenes ?? 0}, Inventario en riesgo: ${alertSummary?.inventario ?? 0}

${memoryContextString}
INSTRUCCIÓN: usa SIEMPRE check_inventory_status o analyze_stock_risk antes de afirmar faltantes. Estructura tu respuesta en ¿Qué está pasando? / ¿Qué va a pasar? / ¿Qué debo hacer?
`;

        const result = await streamText({
          // NOTA: cast por drift de majors (@ai-sdk/google v4 vs ai v3).
          // Si el runtime lo rechaza, el catch degrada al motor determinista.
          model: google(process.env.GEMINI_MODEL || 'gemini-1.5-pro-latest') as any,
          system: `${nexoSystemPrompt}\n\n${realTimeContext}`,
          messages,
          maxTokens: 1200,
          temperature: 0.2,
          tools: {
            navigate_platform: tool({
              description: 'Navega al usuario a una pantalla o módulo específico de INVENTA.AI.',
              parameters: z.object({
                destination_intent: z.string().describe('Intención de navegación del usuario'),
                route: z.string().describe('Ruta relativa validada (ej. /dashboard/reabastecimiento, /inventory/inventory-items, /plans, /dashboard/integraciones)'),
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

            approve_purchase_orders: tool({
              description: 'PROPONE borrador de OC para aprobación del usuario. NUNCA ejecuta: retorna tarjeta con requiresConfirm:true.',
              parameters: z.object({
                itemIds: z.array(z.string()).optional().describe('IDs de SKUs a proponer'),
              }),
              execute: async ({ itemIds }) => {
                const { RestockCalculatorService } = await import('@/services/RestockCalculatorService');
                const { items } = await RestockCalculatorService.calculateRestockItems();
                let targets = (items as any[]).filter((i) => i.suggestedQty > 0);
                if (itemIds?.length) {
                  targets = targets.filter((i) => itemIds.includes(i.id) || itemIds.includes(i.sku));
                }
                const totalInvestment = targets.reduce((s: number, i: any) => s + (i.investment || 0), 0);
                return {
                  success: true,
                  proposed: true,
                  message: 'Dejé la propuesta lista en la tarjeta para tu confirmación.',
                  cards: [
                    {
                      id: `po-${Date.now()}`,
                      kind: 'po_approval',
                      title: `Generar ${targets.length} OC(s) en borrador`,
                      subtitle: `Inversión total S/ ${totalInvestment.toLocaleString()}`,
                      metric: `S/ ${totalInvestment.toLocaleString()}`,
                      payload: {
                        skusCount: targets.length,
                        totalInvestment,
                        itemIds: targets.map((i: any) => i.id),
                      },
                      action: {
                        type: 'generate_oc',
                        label: 'Aprobar Órdenes en Borrador',
                        payload: { itemIds: targets.map((i: any) => i.id) },
                        requiresConfirm: true,
                      },
                    },
                  ],
                };
              },
            }),

            check_inventory_status: tool({
              description: 'Lee el MAESTRO VALORIZADO real + cobertura ROP. Úsala SIEMPRE ante "revisa mi inventario / qué me falta / cómo voy".',
              parameters: z.object({
                scope: z.enum(['full', 'critical', 'low', 'category']).default('full'),
                category: z.string().optional(),
                top: z.number().min(1).max(10).default(5),
              }),
              execute: async ({ scope, category, top }) => {
                const { InventoryMasterService } = await import('@/services/InventoryMasterService');
                const { RestockCalculatorService } = await import('@/services/RestockCalculatorService');
                const summary = InventoryMasterService.getInventorySummary();
                const restock = await RestockCalculatorService.calculateRestockItems().catch(() => ({
                  items: [],
                  criticalCount: 0,
                  totalCapitalRequired: 0,
                }));
                const restockBySku = new Map(((restock as any).items as any[]).map((r: any) => [r.sku, r]));
                let lowStock = summary.lowStock;
                if (scope === 'critical') lowStock = lowStock.filter((i) => i.health === 'critical');
                if (scope === 'low') lowStock = lowStock.filter((i) => i.health !== 'healthy');
                if (scope === 'category' && category) {
                  lowStock = summary.lowStock.filter((i) =>
                    i.category.toLowerCase().includes(category.toLowerCase())
                  );
                }
                const missing = lowStock.slice(0, top).map((i) => {
                  const r: any = restockBySku.get(i.sku);
                  return {
                    sku: i.sku,
                    name: i.name,
                    category: i.category,
                    physicalStock: i.physicalStock,
                    safetyStock: i.safetyStock,
                    unitCost: i.unitCost,
                    totalValue: i.totalValue,
                    health: i.health,
                    healthLabel: i.healthLabel,
                    coverageDays: r?.coverageDays ?? null,
                    rop: r?.rop ?? null,
                    suggestedQty: r?.suggestedQty ?? 0,
                    investment: r?.investment ?? 0,
                    provider: r?.provider ?? 'Sin asignar',
                  };
                });
                return {
                  kpis: summary.kpis,
                  alerts: summary.alerts,
                  totalUnits: summary.kpis.totalUnits,
                  totalValue: summary.kpis.totalValue,
                  lowCount: summary.alerts.lowStock,
                  outOfStock: summary.alerts.outOfStock,
                  missing,
                  capitalRequired: (restock as any).totalCapitalRequired ?? 0,
                  criticalCount: (restock as any).criticalCount ?? 0,
                };
              },
            }),

            generate_order: tool({
              description: 'PROPONE borrador de OC (NO ejecuta). Retorna payload exacto para POApprovalCard. Requiere confirmación en /api/nexo/execute con confirm:true.',
              parameters: z.object({
                itemIds: z.array(z.string()).optional(),
                sku: z.string().optional(),
                top: z.number().min(1).max(10).default(5),
              }),
              execute: async ({ itemIds, sku, top }) => {
                const { RestockCalculatorService } = await import('@/services/RestockCalculatorService');
                const { items } = await RestockCalculatorService.calculateRestockItems();
                let targets = (items as any[]).filter((i) => i.suggestedQty > 0);
                if (sku) {
                  targets = targets.filter((i: any) => i.sku.toUpperCase().includes(sku.toUpperCase()));
                }
                if (itemIds?.length) {
                  targets = targets.filter((i: any) => itemIds.includes(i.id) || itemIds.includes(i.sku));
                }
                targets = targets.slice(0, top);
                const totalInvestment = targets.reduce((s: number, i: any) => s + (i.investment || 0), 0);
                return {
                  cards: [
                    {
                      id: `po-${Date.now()}`,
                      kind: 'po_approval',
                      title: `Generar ${targets.length} OC(s) en borrador`,
                      subtitle: `Inversión total S/ ${totalInvestment.toLocaleString()}`,
                      metric: `S/ ${totalInvestment.toLocaleString()}`,
                      payload: {
                        skusCount: targets.length,
                        totalInvestment,
                        itemIds: targets.map((i: any) => i.id),
                        lines: targets.map((i: any) => ({
                          sku: i.sku,
                          name: i.name,
                          suggestedQty: i.suggestedQty,
                          investment: i.investment,
                          provider: i.provider,
                        })),
                      },
                      action: {
                        type: 'generate_oc',
                        label: 'Aprobar Órdenes en Borrador',
                        payload: { itemIds: targets.map((i: any) => i.id) },
                        requiresConfirm: true,
                      },
                    },
                  ],
                  summary: `Borrador listo: ${targets.length} SKUs por S/ ${totalInvestment.toLocaleString()}. Requiere tu clic en Aprobar.`,
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
    const nexoRes = await NexoEngineService.query(userMessage, pathname, email, { history: messages });
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
