import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/src/middleware/auth.middleware';
import { handleError } from '@/src/middleware/error.middleware';
import {
  listExceptionEvents,
  listExpiredApprovals,
} from '@/src/services/exception/exception.service';
import type { ExceptionEventType } from '@/src/services/exception/exception.service';

/**
 * GET /api/exceptions/inbox — List reject logs, break-glass items, expired approvals (002 US4)
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const type = request.nextUrl.searchParams.get('type') as ExceptionEventType | null;
    const limit = parseInt(request.nextUrl.searchParams.get('limit') ?? '50', 10) || 50;

    const [items, expiredApprovals] = await Promise.all([
      listExceptionEvents({ type: type ?? undefined, limit }),
      listExpiredApprovals(limit),
    ]);

    return NextResponse.json({ items, expiredApprovals });
  } catch (error) {
    return handleError(error);
  }
}
