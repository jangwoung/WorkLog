import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/src/middleware/auth.middleware';
import { handleError } from '@/src/middleware/error.middleware';
import { listApprovalInbox } from '@/src/services/approval/approval.service';

/**
 * GET /api/approvals/inbox — List approval requests (002 AI Review MVP)
 */
export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    const items = await listApprovalInbox(userId);
    return NextResponse.json({ items });
  } catch (error) {
    return handleError(error);
  }
}
