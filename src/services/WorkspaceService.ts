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
  public static validateSlug(rawSlug: string): SlugValidationResult {
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

    // Comprobar unicidad en base de datos
    const existing = db.getWorkspaceBySlug(slug);
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
  public static createWorkspace(
    userId: string,
    name: string,
    rawSlug: string
  ): { workspace: WorkspaceRecord; membership: WorkspaceUserRecord } {
    const validation = this.validateSlug(rawSlug);
    if (!validation.valid || !validation.available) {
      throw new Error(validation.error || 'Slug de espacio de trabajo no válido.');
    }

    const trimmedName = (name || '').trim();
    if (!trimmedName || trimmedName.length < 2) {
      throw new Error('El nombre de la empresa debe tener al menos 2 caracteres.');
    }

    const user = db.getUser(userId);
    if (!user) {
      throw new Error(`Usuario con ID ${userId} no encontrado en la base de datos.`);
    }

    const result = db.createWorkspaceWithTransaction(userId, trimmedName, validation.slug);

    db.addLog(
      'system',
      'INFO',
      'WORKSPACE_CREATED',
      'EXITOSO',
      `Espacio de trabajo "${result.workspace.name}" (${result.workspace.slug_url}.inventa.ai) creado para usuario ${user.email} con rol OWNER.`,
      user.email
    );

    return result;
  }
}
