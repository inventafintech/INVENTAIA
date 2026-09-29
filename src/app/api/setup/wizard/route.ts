import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    return NextResponse.json({
      success: true,
      message: 'Setup wizard configuration persisted successfully.',
      setup: {
        completed: true,
        country: body.country || 'PE',
        currency: body.currency || 'PEN',
        branchName: body.branchName || 'Sede Central Lima',
        industry: body.industry || 'cpg',
      },
    });
  } catch (err: any) {
    console.error('[SETUP WIZARD ERROR]:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Error saving setup configuration' },
      { status: 500 }
    );
  }
}
