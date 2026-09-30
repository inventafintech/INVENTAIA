import { createGroq } from '@ai-sdk/groq';
import { streamText, tool, isStepCount } from 'ai';
import { z } from 'zod';
import { NEXO_SYSTEM_PROMPT } from '@/ai/prompt';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireWorkspace } from '@/lib/requireWorkspace';
import { InventoryMasterService } from '@/services/InventoryMasterService';
import { NexoMemoryService } from '@/services/NexoMemoryService';
import { createClient } from '@/utils/supabase/server';

export const maxDuration = 60; 

export async function POST(req: Request) {
  const auth = await requireWorkspace();
  if (auth.error) return auth.error;
  const { messages, currentPath } = await req.json();
  const session = await getServerSession(authOptions);

  const targetWorkspaceId = (session?.user as any)?.workspace_id || auth.ctx.workspaceId;
  
  // Extraer el último mensaje del usuario para hacer RAG vectorial
  const lastMessage = messages.filter((m: any) => m.role === 'user').pop()?.content || '';
  
  let memoryContext = '';
  // OPTIMIZACIÓN FREE TIER: No hacer RAG (ahorra 1 petición) si es un saludo corto
  if (lastMessage && lastMessage.length > 10) {
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

  const groq = createGroq({
    apiKey: process.env.GROQ_API_KEY,
  });

  const result = streamText({
    model: groq('openai/gpt-oss-120b'),
    stopWhen: isStepCount(5),
    maxRetries: 0,
    instructions: dynamicSystemPrompt,
    messages,
    tools: {
      get_inventory_status: tool({
        description: 'Consulta la base de datos para obtener el estado real del inventario y las alertas de stock.',
        inputSchema: z.object({
          category: z.string().nullable().optional(),
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
      }),
      add_inventory_item: tool({
        description: 'Agrega un nuevo producto (SKU) al inventario de la empresa.',
        inputSchema: z.object({
          name: z.string().describe('Nombre del producto a agregar'),
          category: z.string().optional().describe('Categoría del producto'),
          initialStock: z.number().default(0).describe('Cantidad inicial en stock'),
        }),
        execute: async ({ name, category, initialStock }) => {
          const supabase = await createClient();
          const skuCode = name.substring(0, 3).toUpperCase() + Math.floor(Math.random() * 1000);
          
          let catId = null;
          if (category) {
             const { data: catData } = await supabase.from('categories').select('id').ilike('name', `%${category}%`).limit(1);
             if (catData && catData.length > 0) catId = catData[0].id;
             else {
               const newCatId = crypto.randomUUID();
               const { data: newCat, error: catError } = await supabase.from('categories').insert({ id: newCatId, name: category }).select('id').single();
               if (newCat) catId = newCat.id;
               else if (!catError) catId = newCatId;
             }
          }
          if (!catId) {
             const { data: fallbackCat } = await supabase.from('categories').select('id').limit(1);
             if (fallbackCat && fallbackCat.length > 0) catId = fallbackCat[0].id;
          }

          if (catId) {
            const prodId = crypto.randomUUID();
            const { data: newProd, error } = await supabase.from('products').insert({
              id: prodId,
              sku_code: skuCode,
              name,
              category_id: catId,
              unit_cost: 0,
              unit_price: 0
            }).select('id').single();
            
            if (error) {
              return { status: 'error', message: `No se pudo agregar el producto. Razón: ${error.message}` };
            }
            
            if (newProd || prodId) {
              const invId = crypto.randomUUID();
              const { error: invError } = await supabase.from('inventory_levels').insert({
                id: invId,
                product_id: newProd ? newProd.id : prodId,
                physical_stock: initialStock,
                safety_stock: 5
              });
              if (invError) {
                return { status: 'warning', message: `Producto creado pero falló la inicialización de stock: ${invError.message}` };
              }
            }
          } else {
             return { status: 'error', message: 'No se pudo determinar o crear una categoría para el producto.' };
          }

          return {
            status: 'success',
            message: `El producto "${name}" ha sido agregado exitosamente al catálogo con ${initialStock} unidades.`,
            action_taken: 'Product creation registered in the database.'
          };
        },
      }),
      adjust_inventory_quantity: tool({
        description: 'Ajusta, suma o resta cantidades al inventario de un producto específico.',
        inputSchema: z.object({
          productName: z.string().describe('Nombre del producto'),
          quantityToAdjust: z.number().describe('Cantidad a ajustar (positiva para sumar, negativa para restar)'),
          reason: z.string().optional().describe('Razón del ajuste (ej. merma, compra, corrección)'),
        }),
        execute: async ({ productName, quantityToAdjust, reason }) => {
          const supabase = await createClient();
          const { data: prodData } = await supabase.from('products').select('id, name').ilike('name', `%${productName}%`).limit(1);
          
          if (prodData && prodData.length > 0) {
            const productId = prodData[0].id;
            const { data: invLevel } = await supabase.from('inventory_levels').select('physical_stock, safety_stock').eq('product_id', productId).single();
            if (invLevel) {
               const newStock = Math.max(0, invLevel.physical_stock + quantityToAdjust);
               const { error } = await supabase.from('inventory_levels').update({ physical_stock: newStock }).eq('product_id', productId);
               
               if (error) {
                  return { status: 'error', message: `Fallo al actualizar el stock: ${error.message}` };
               }
            } else {
               return { status: 'error', message: 'El producto no tiene registro de niveles de inventario.' };
            }
          } else {
             return { status: 'error', message: 'No se encontró el producto en la base de datos.' };
          }
          return {
            status: 'success',
            message: `Se ha ajustado el inventario de "${productName}" en ${quantityToAdjust} unidades. (Razón: ${reason || 'No especificada'})`
          };
        },
      }),
      import_inventory_excel: tool({
        description: 'Genera un link o procedimiento para importar masivamente el inventario vía archivo Excel.',
        inputSchema: z.object({}),
        execute: async () => {
          return {
            status: 'success',
            message: 'El módulo de importación masiva está listo. Redirigiendo o informando al usuario que debe ir a /inventory/imports para subir su plantilla Excel.',
            navigationTarget: '/inventory/imports'
          };
        },
      }),
      create_vendor: tool({
        description: 'Crea un nuevo proveedor en la base de datos.',
        inputSchema: z.object({
          vendorName: z.string().describe('Nombre del proveedor'),
          contactEmail: z.string().optional().describe('Email de contacto'),
        }),
        execute: async ({ vendorName, contactEmail }) => {
          const supabase = await createClient();
          const { error } = await supabase.from('suppliers').insert({
            id: crypto.randomUUID(),
            name: vendorName,
            contact_info: contactEmail ? { email: contactEmail } : {},
            integration_type: 'traditional',
            lead_time_days: 5
          });
          if (error) {
             return { status: 'error', message: `Fallo al crear proveedor: ${error.message}` };
          }
          return {
            status: 'success',
            message: `El proveedor "${vendorName}" ha sido registrado correctamente.`
          };
        },
      }),
      create_purchase_order: tool({
        description: 'Genera una orden de compra en borrador para un proveedor.',
        inputSchema: z.object({
          vendorName: z.string().describe('Nombre del proveedor'),
          productName: z.string().describe('Nombre del producto a comprar'),
          quantity: z.number().describe('Cantidad solicitada'),
        }),
        execute: async ({ vendorName, productName, quantity }) => {
          const supabase = await createClient();
          const { data: supData } = await supabase.from('suppliers').select('id').ilike('name', `%${vendorName}%`).limit(1);
          let supplierId = null;
          if (supData && supData.length > 0) supplierId = supData[0].id;
          else {
             const newSupId = crypto.randomUUID();
             const { data: newSup, error: supError } = await supabase.from('suppliers').insert({ id: newSupId, name: vendorName, contact_info: {}, integration_type: 'traditional', lead_time_days: 5 }).select('id').single();
             if (newSup) supplierId = newSup.id;
             else if (!supError) supplierId = newSupId;
          }

          if (supplierId) {
             const orderNumber = `PO-${Math.floor(Math.random() * 100000)}`;
             const estimatedArrival = new Date();
             estimatedArrival.setDate(estimatedArrival.getDate() + 5);
             
             const { error } = await supabase.from('purchase_orders').insert({
                id: crypto.randomUUID(),
                order_number: orderNumber,
                supplier_id: supplierId,
                condition: 'Net 30',
                total_amount: quantity * 10,
                estimated_arrival: estimatedArrival.toISOString(),
                status: 'draft'
             });
             
             if (error) {
                return { status: 'error', message: `No se pudo generar la orden: ${error.message}` };
             }
          } else {
             return { status: 'error', message: 'No se pudo vincular ni crear el proveedor.' };
          }

          return {
            status: 'success',
            message: `Se ha creado una orden de compra en borrador para ${quantity} unidades de "${productName}" al proveedor "${vendorName}".`
          };
        },
      }),
      navigate_to_module: tool({
        description: 'Redirige al usuario a una pantalla o módulo específico dentro de la plataforma.',
        inputSchema: z.object({
          route: z.string().describe('Ruta de la pantalla (ej. /inventory/imports, /products/products)'),
        }),
        execute: async ({ route }) => {
          return {
            status: 'success',
            message: `Redirigiendo al usuario a la ruta: ${route}`,
            route
          };
        },
      })
    },
  });

  return result.toTextStreamResponse();
}
