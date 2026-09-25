import { openai } from '@ai-sdk/openai';
import { embed } from 'ai';
import { createClient } from '@supabase/supabase-js';

// Cliente estricto de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// ─── Interfaces ────────────────────────────────────────────────────────
export interface MemoryMetadata {
  action?: string;
  amount?: number;
  user?: string;
  date?: string;
  sku?: string;
  source?: 'user_chat' | 'system_event' | 'document';
  [key: string]: any;
}

export interface MemoryPayload {
  workspace_id: string;
  content: string;
  metadata?: MemoryMetadata;
}

export interface RetrievedMemory {
  id: string;
  content: string;
  metadata: MemoryMetadata;
  similarity: number;
}

// ─── NexoMemoryService ────────────────────────────────────────────────
export const NexoMemoryService = {
  /**
   * Vectoriza un texto y lo inserta como memoria persistente en Supabase.
   */
  async storeNexoMemory(payload: MemoryPayload): Promise<void> {
    if (!supabaseUrl) return; // Fail safe si no hay Supabase configurado

    try {
      // 1. Convertir el texto en un vector de 1536 dimensiones (text-embedding-3-small)
      const { embedding } = await embed({
        model: openai.embedding('text-embedding-3-small'),
        value: payload.content,
      });

      // 2. Inserción rápida en Supabase
      const { error } = await supabase
        .from('nexo_memory_embeddings')
        .insert({
          workspace_id: payload.workspace_id,
          content: payload.content,
          embedding: embedding,
          metadata: payload.metadata || {},
        });

      if (error) throw error;
    } catch (e) {
      console.error('[NexoMemoryService] Error al guardar memoria:', e);
    }
  },

  /**
   * Ejecuta el RAG en <100ms. Vectoriza la consulta del usuario y busca 
   * mediante similitud del coseno usando el índice HNSW.
   */
  async retrieveRelevantMemories(
    query: string, 
    workspaceId: string, 
    matchThreshold: number = 0.75, // QA Guardrail: Evita inyectar basura irrelevante
    matchCount: number = 3
  ): Promise<RetrievedMemory[]> {
    if (!supabaseUrl) return [];

    try {
      const { embedding } = await embed({
        model: openai.embedding('text-embedding-3-small'),
        value: query,
      });

      // 3. Invocar el RPC creado en el esquema SQL (match_nexo_memories)
      const { data, error } = await supabase.rpc('match_nexo_memories', {
        query_embedding: embedding,
        match_threshold: matchThreshold,
        match_count: matchCount,
        p_workspace_id: workspaceId,
      });

      if (error) throw error;
      return (data as RetrievedMemory[]) || [];
    } catch (e) {
      console.error('[NexoMemoryService] Error al recuperar memoria (RAG):', e);
      return [];
    }
  }
};
