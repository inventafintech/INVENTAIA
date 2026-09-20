import { db, WorkspaceRecord, WorkspaceUserRecord } from '@/lib/db';

export interface SlugValidationResult {
  valid: boolean;
  available: boolean;
  error?: string;
  slug: string;
}

export class WorkspaceService {
  private static readonly RESERVED_SLUGS = new Set([
    'api',
    'admin',
    'dashboard',
    'onboarding',
    'login',
    'logout',
    'auth',
    'settings',
    'ajustes',
    'inventa',
    'app',
    'static',
    'public',
    'help',
    'soporte',
    'root',
    'null',
    'undefined',
  ]);

  /**
   * Valida en tiempo real que el slug sea seguro, válido y único en la base de datos
   */
  public static async validateSlug(rawSlug: string): Promise<SlugValidationResult> {
    const slug = (rawSlug || '').toLowerCase().trim();

    if (!slug) {
      return {
        valid: false,
        available: false,
        error: 'El slug del espacio de trabajo es requerido.',
        slug,
      };
    }

    if (slug.length < 3) {
      return {
        valid: false,
        available: false,
        error: 'El identificador debe tener al menos 3 caracteres.',
        slug,
      };
    }

    if (slug.length > 30) {
      return {
        valid: false,
        available: false,
        error: 'El identificador no puede exceder los 30 caracteres.',
        slug,
      };
    }

    // Solo letras minúsculas, números y guiones sencillos
    const slugRegex = /^[a-z0-9]([a-z0-9-]{1,28}[a-z0-9])?$/;
    if (!slugRegex.test(slug)) {
      return {
        valid: false,
        available: false,
        error: 'Solo se permiten letras minúsculas (a-z), números (0-9) y guiones simples.',
        slug,
      };
    }

    if (slug.includes('--')) {
      return {
        valid: false,
        available: false,
        error: 'No se permiten guiones consecutivos.',
        slug,
      };
    }

    if (this.RESERVED_SLUGS.has(slug)) {
      return {
        valid: false,
        available: false,
        error: 'Este identificador está reservado por el sistema.',
        slug,
      };
    }

    // Comprobar unicidad en base de datos (Supabase)
    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();
    const { data: existing } = await supabase.from('workspaces').select('id').eq('slug_url', slug).maybeSingle();
    
    if (existing) {
      return {
        valid: true,
        available: false,
        error: `El espacio de trabajo "${slug}.inventa.ai" ya está registrado.`,
        slug,
      };
    }

    return {
      valid: true,
      available: true,
      slug,
    };
  }

  /**
   * Ejecuta la transacción de creación de espacio de trabajo y asignación como OWNER
   */
  public static async createWorkspace(
    userId: string,
    name: string,
    rawSlug: string,
    userFallback?: { email?: string; name?: string; avatar_url?: string }
  ): Promise<{ workspace: any; membership: any }> {
    const validation = await this.validateSlug(rawSlug);
    if (!validation.valid || !validation.available) {
      throw new Error(validation.error || 'Slug de espacio de trabajo no válido.');
    }

    const trimmedName = (name || '').trim();
    if (!trimmedName || trimmedName.length < 2) {
      throw new Error('El nombre de la empresa debe tener al menos 2 caracteres.');
    }

    // Buscar por ID, luego por email o crear si proviene de una sesión OAuth válida
    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();
    
    let dbUser;
    if (userId) {
      const { data } = await supabase.from('users').select('*').eq('id', userId).single();
      dbUser = data;
    }
    
    if (!dbUser && userFallback?.email) {
      const { data } = await supabase.from('users').select('*').eq('email', userFallback.email).single();
      dbUser = data;
    }
    
    if (!dbUser && userFallback?.email) {
      const id = `usr-${Date.now()}`;
      const { data: inserted } = await supabase.from('users').insert({
        id,
        name: userFallback.name || 'Usuario',
        email: userFallback.email,
        avatar_url: userFallback.avatar_url,
      }).select().single();
      dbUser = inserted;
    }

    if (!dbUser) {
      throw new Error(`Usuario con ID ${userId} no encontrado en la base de datos.`);
    }

    const wsId = `ws-${Date.now()}`;
    const workspace = {
      id: wsId,
      name: trimmedName,
      slug_url: validation.slug,
      settings: {}
    };

    const membership = {
      id: `wu-${Date.now()}`,
      user_id: dbUser.id,
      workspace_id: wsId,
      role: 'OWNER'
    };

    const { error: wsError } = await supabase.from('workspaces').insert(workspace);
    if (wsError) throw new Error(wsError.message);
    
    const { error: memError } = await supabase.from('workspace_users').insert(membership);
    if (memError) throw new Error(memError.message);

    // Actualizar el registro del usuario inyectándole el workspace_id transaccionalmente
    await supabase.from('users').update({ workspace_id: wsId }).eq('id', dbUser.id);
    
    db.addLog(
      'system',
      'INFO',
      'WORKSPACE_CREATED',
      'EXITOSO',
      `Espacio de trabajo "${workspace.name}" (${workspace.slug_url}.inventa.ai) creado para usuario ${dbUser.email} con rol OWNER.`,
      dbUser.email
    );

    return { workspace, membership };
  }
}
