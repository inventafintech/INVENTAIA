-- 1. Habilitar la extensión vectorial en PostgreSQL (Supabase lo soporta nativamente)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Crear la tabla de memoria a largo plazo (Multitenant)
CREATE TABLE IF NOT EXISTS public.nexo_memory_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL, -- Para seguridad y aislamiento multitenant
    content TEXT NOT NULL,      -- Texto original del recuerdo
    embedding VECTOR(768),      -- Vector de Google Gemini text-embedding-004
    metadata JSONB DEFAULT '{}'::jsonb, -- Tags, tipo de evento, autor, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Crear un índice HNSW optimizado para distancia del coseno (cosine similarity)
-- Se requiere establecer 'm' y 'ef_construction' para afinar la relación velocidad/precisión.
CREATE INDEX IF NOT EXISTS nexo_memory_embedding_idx 
ON public.nexo_memory_embeddings 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 4. Índice secundario B-Tree para filtrar por workspace de forma ultrarrápida antes del cálculo de vectores
CREATE INDEX IF NOT EXISTS nexo_memory_workspace_idx 
ON public.nexo_memory_embeddings (workspace_id);

-- 5. Crear la función de búsqueda de similitud (RPC) para invocarla desde Supabase Client
CREATE OR REPLACE FUNCTION match_nexo_memories (
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  p_workspace_id uuid
)
RETURNS TABLE (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    nme.id,
    nme.content,
    nme.metadata,
    1 - (nme.embedding <=> query_embedding) AS similarity
  FROM public.nexo_memory_embeddings nme
  WHERE nme.workspace_id = p_workspace_id
    AND 1 - (nme.embedding <=> query_embedding) > match_threshold
  ORDER BY nme.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
