import { NextResponse } from 'next/server';
import { AppShellService } from '@/services/AppShellService';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const state = AppShellService.getAppShellState();
    return NextResponse.json({
      success: true,
      state,
    });
  } catch (error: any) {
    console.error('Error in GET /api/dashboard/shell:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al obtener estado del App Shell' },
      { status: 500 }
    );
  }
}
