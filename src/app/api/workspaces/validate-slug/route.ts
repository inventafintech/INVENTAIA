import { NextRequest, NextResponse } from 'next/server';
import { WorkspaceService } from '@/services/WorkspaceService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get('slug') || '';

    const result = WorkspaceService.validateSlug(slug);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Error al validar slug' },
      { status: 500 }
    );
  }
}
