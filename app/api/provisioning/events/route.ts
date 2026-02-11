import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/src/middleware/auth.middleware';
import { handleError } from '@/src/middleware/error.middleware';
import { listProvisioningEvents } from '@/src/services/provisioning/provisioning.service';

/**
 * GET /api/provisioning/events
 * List provisioning events for audit. Query: optional from, to, intentId, limit.
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from') ?? undefined;
    const to = searchParams.get('to') ?? undefined;
    const intentId = searchParams.get('intentId') ?? undefined;
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Math.min(Math.max(1, parseInt(limitParam, 10) || 50), 200) : undefined;

    const events = await listProvisioningEvents({ from, to, intentId, limit });
    return NextResponse.json({ events });
  } catch (error) {
    return handleError(error);
  }
}
