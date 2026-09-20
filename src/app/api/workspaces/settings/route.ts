import { NextRequest, NextResponse } from 'next/server';
import { GET as getAjustes, PUT as putAjustes } from '@/app/api/dashboard/ajustes/route';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  return getAjustes();
}

export async function PUT(req: NextRequest) {
  return putAjustes(req);
}

export async function PATCH(req: NextRequest) {
  return putAjustes(req);
}
