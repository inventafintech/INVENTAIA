import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SessionManager } from '@/lib/session';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const customSession = await SessionManager.getSession();
    const nextAuthSession = await getServerSession(authOptions);

    const workspaceId =
      customSession?.workspaceId ||
      (nextAuthSession?.user as any)?.workspace_id ||
      (nextAuthSession?.user as any)?.workspace?.id ||
      'ws-default';

    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();

    let workspace;
    if (workspaceId !== 'ws-default') {
      const { data } = await supabase.from('workspaces').select('*').eq('id', workspaceId).maybeSingle();
      workspace = data;
      if (workspace && typeof workspace.settings === 'string') {
        try { workspace.settings = JSON.parse(workspace.settings); } catch(e){}
      }
    }

    const sessionSettings = customSession?.settings || {};
    const savedSettings = workspace?.settings || sessionSettings;

    const companyName =
      workspace?.name ||
      customSession?.workspaceName ||
      (nextAuthSession?.user as any)?.workspace?.name ||
      '';

    const ruc = savedSettings.ruc || sessionSettings.ruc || customSession?.workspaceRuc || '';

    const settings = {
      // Claves canónicas
      razonSocial: companyName,
      ruc,
      leadTime: savedSettings.leadTime ?? sessionSettings.leadTime ?? 5,
      sla: savedSettings.sla || sessionSettings.sla || '95',
      moneda: savedSettings.currency || sessionSettings.currency || 'PEN',
      horizonteProyeccion: savedSettings.horizon || sessionSettings.horizon || '30',
      alertasWhatsapp: savedSettings.notifyWhatsApp ?? sessionSettings.notifyWhatsApp ?? true,
      resumenCorreo: savedSettings.notifyEmail ?? sessionSettings.notifyEmail ?? true,

      // Alias retrocompatibles
      companyName,
      currency: savedSettings.currency || sessionSettings.currency || 'PEN',
      horizon: savedSettings.horizon || sessionSettings.horizon || '30',
      notifyWhatsApp: savedSettings.notifyWhatsApp ?? sessionSettings.notifyWhatsApp ?? true,
      notifyEmail: savedSettings.notifyEmail ?? sessionSettings.notifyEmail ?? true,
    };

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error: any) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const customSession = await SessionManager.getSession();
    const nextAuthSession = await getServerSession(authOptions);

    const body = await req.json().catch(() => ({}));
    const {
      razonSocial,
      companyName,
      ruc,
      leadTime,
      sla,
      moneda,
      currency,
      horizonteProyeccion,
      horizon,
      alertasWhatsapp,
      notifyWhatsApp,
      resumenCorreo,
      notifyEmail,
    } = body;

    const targetName = (razonSocial || companyName || '').trim();
    if (!targetName || targetName.length < 2) {
      return NextResponse.json(
        { success: false, error: 'La Razón Social debe tener al menos 2 caracteres.' },
        { status: 400 }
      );
    }

    const targetMoneda = moneda || currency || 'PEN';
    const targetHorizon = horizonteProyeccion || horizon || '30';
    const targetWhatsapp = typeof alertasWhatsapp === 'boolean' ? alertasWhatsapp : (notifyWhatsApp ?? true);
    const targetEmail = typeof resumenCorreo === 'boolean' ? resumenCorreo : (notifyEmail ?? true);
    const targetLeadTime = typeof leadTime === 'number' ? leadTime : Number(leadTime) || 5;
    const targetSla = sla || '95';
    const targetRuc = (ruc || '').trim();

    const workspaceId =
      customSession?.workspaceId ||
      (nextAuthSession?.user as any)?.workspace_id ||
      (nextAuthSession?.user as any)?.workspace?.id ||
      'ws-default';

    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();

    // Persistir en base de datos real (Supabase)
    let updated;
    const targetWorkspaceId = workspaceId !== 'ws-default' ? workspaceId : `ws-${Date.now()}`;
    const slugUrl = customSession?.workspaceSlug || (nextAuthSession?.user as any)?.workspace?.slug || `ws-${targetWorkspaceId}`;

    const { data, error } = await supabase.from('workspaces').upsert({
      id: targetWorkspaceId,
      name: targetName,
      slug_url: slugUrl,
      settings: {
        ruc: targetRuc,
        leadTime: targetLeadTime,
        sla: targetSla,
        currency: targetMoneda,
        horizon: targetHorizon,
        notifyWhatsApp: targetWhatsapp,
        notifyEmail: targetEmail,
      },
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' }).select().maybeSingle();
    
    if (error) {
      console.error('Supabase Error en update de ajustes:', error);
      return NextResponse.json(
        { success: false, error: 'Error al actualizar base de datos: ' + error.message },
        { status: 500 }
      );
    }
    updated = data;

    // Asegurar vinculación del usuario en la tabla users
    const userEmail = nextAuthSession?.user?.email || customSession?.email;
    if (userEmail) {
      await supabase.from('users').update({ workspace_id: targetWorkspaceId }).eq('email', userEmail);
    }

    // Actualizar o crear sesión activa con cookie segura para persistencia entre lambdas serverless
    const baseSession = customSession || {
      userId: (nextAuthSession?.user as any)?.id || 'usr-default',
      email: nextAuthSession?.user?.email || 'admin@inventa.ai',
      name: nextAuthSession?.user?.name || targetName || 'Usuario',
      avatarUrl: (nextAuthSession?.user as any)?.image,
      workspaceId: targetWorkspaceId,
      workspaceSlug: slugUrl,
      role: 'OWNER' as const,
    };

    await SessionManager.createSession({
      ...baseSession,
      workspaceId: targetWorkspaceId,
      workspaceName: targetName,
      workspaceRuc: targetRuc,
      settings: {
        ruc: targetRuc,
        leadTime: targetLeadTime,
        sla: targetSla,
        currency: targetMoneda,
        horizon: targetHorizon,
        notifyWhatsApp: targetWhatsapp,
        notifyEmail: targetEmail,
      },
    });

    db.addLog(
      'system',
      'INFO',
      'WORKSPACE_SETTINGS_UPDATED',
      'EXITOSO',
      `Configuración actualizada para "${targetName}" (RUC: ${targetRuc || 'N/A'}) en base de datos.`,
      baseSession.email
    );

    const normalizedSettings = {
      razonSocial: targetName,
      ruc: targetRuc,
      leadTime: targetLeadTime,
      sla: targetSla,
      moneda: targetMoneda,
      horizonteProyeccion: targetHorizon,
      alertasWhatsapp: targetWhatsapp,
      resumenCorreo: targetEmail,
    };

    return NextResponse.json({
      success: true,
      workspaceName: targetName,
      settings: normalizedSettings,
      workspace: updated || { id: workspaceId, name: targetName },
      message: 'Configuración guardada exitosamente en la base de datos.',
    });
  } catch (error: any) {
    console.error('Error saving settings:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
