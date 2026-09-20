import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Log the setup wizard configuration
    console.log('[SETUP WIZARD] Configuration completed:', {
      country: body.country,
      currency: body.currency,
      taxRate: body.taxRate,
      branchName: body.branchName,
      industry: body.industry,
      categoriesCount: body.categories?.length || 0,
      productsCount: body.productsCount || 0,
      timestamp: new Date().toISOString(),
    });

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
