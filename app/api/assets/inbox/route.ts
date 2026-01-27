import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/src/middleware/auth.middleware';
import { handleError } from '@/src/middleware/error.middleware';
import { listInbox } from '@/src/services/asset-card/asset-card.service';
import { serializeAssetCardForApi } from '@/src/utils/asset-card-serializer';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * GET /api/assets/inbox
 * Paginated list of AssetCards with status inbox or flagged (pending review).
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { userId } = authResult;
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const limit = limitParam
      ? Math.min(Math.max(1, parseInt(limitParam, 10) || DEFAULT_LIMIT), MAX_LIMIT)
      : DEFAULT_LIMIT;
    const cursor = searchParams.get('cursor') || undefined;

    const { assetCards, nextCursor, hasMore } = await listInbox({
      userId,
      limit,
      cursor,
    });

    const response = {
      assetCards: assetCards.map(serializeAssetCardForApi),
      nextCursor,
      hasMore,
    };

    return NextResponse.json(response);
  } catch (error) {
    return handleError(error);
  }
}
