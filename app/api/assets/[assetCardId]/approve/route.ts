import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/src/middleware/auth.middleware';
import { handleError } from '@/src/middleware/error.middleware';
import { approveAssetCard } from '@/src/services/asset-card/asset-card.service';
import { logDecision } from '@/src/services/decision-log/decision-log.service';
import { serializeAssetCardForApi } from '@/src/utils/asset-card-serializer';

interface RouteParams {
  params: { assetCardId: string };
}

/**
 * POST /api/assets/:assetCardId/approve
 * Approve an AssetCard (inbox or flagged → approved); log decision.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { userId } = authResult;
    const { assetCardId } = params;

    const card = await approveAssetCard(assetCardId, userId);
    await logDecision({ userId, assetCardId, actionType: 'approve' });

    return NextResponse.json({
      assetCardId: card.assetCardId,
      status: card.status,
      approvedAt: card.approvedAt?.toDate().toISOString(),
    });
  } catch (error) {
    return handleError(error);
  }
}
