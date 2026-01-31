import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/src/middleware/auth.middleware';
import { handleError } from '@/src/middleware/error.middleware';
import { listLibrary } from '@/src/services/asset-card/asset-card.service';
import { serializeAssetCardForApi } from '@/src/utils/asset-card-serializer';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const VALID_STATUSES = ['approved', 'edited', 'exported'] as const;

/**
 * GET /api/assets/library
 * Paginated list of approved/edited/exported AssetCards; optional status filter.
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
    const statusParam = searchParams.get('status');
    const status =
      statusParam && VALID_STATUSES.includes(statusParam as (typeof VALID_STATUSES)[number])
        ? (statusParam as 'approved' | 'edited' | 'exported')
        : undefined;

    const { assetCards, nextCursor, hasMore } = await listLibrary({
      userId,
      limit,
      cursor,
      status,
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
