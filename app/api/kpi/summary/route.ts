import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/src/middleware/auth.middleware';
import { handleError } from '@/src/middleware/error.middleware';
import { getKPISummary } from '@/src/services/kpi/kpi.service';

/**
 * GET /api/kpi/summary — KPI aggregation (002 AC-05). Query: optional from, to.
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const from = request.nextUrl.searchParams.get('from') ?? undefined;
    const to = request.nextUrl.searchParams.get('to') ?? undefined;
    const result = await getKPISummary({ from, to });
    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
}
