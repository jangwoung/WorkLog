import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/src/middleware/auth.middleware';
import { handleError } from '@/src/middleware/error.middleware';
import { getAssetCardById, rejectAssetCard } from '@/src/services/asset-card/asset-card.service';
import { logDecision } from '@/src/services/decision-log/decision-log.service';
import { serializeAssetCardForApi } from '@/src/utils/asset-card-serializer';
import { getAssetCardsCollection } from '@/src/infrastructure/firestore/collections';

/**
 * GET /api/assets/:assetCardId
 * Return a single AssetCard if owned by the current user.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ assetCardId: string }> }
) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { userId } = authResult;
    const { assetCardId } = await context.params;

    const card = await getAssetCardById(assetCardId, userId);
    if (!card) {
      const col = getAssetCardsCollection();
      const doc = await col.doc(assetCardId).get();
      if (doc.exists && (doc.data() as { userId?: string })?.userId !== userId) {
        return NextResponse.json(
          { error: { code: 'FORBIDDEN', message: 'AssetCard does not belong to user' } },
          { status: 403 }
        );
      }
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'AssetCard not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json(serializeAssetCardForApi(card));
  } catch (error) {
    return handleError(error);
  }
}

/**
 * DELETE /api/assets/:assetCardId
 * Reject/remove AssetCard (inbox or flagged only); log decision.
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ assetCardId: string }> }
) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { userId } = authResult;
    const { assetCardId } = await context.params;

    await rejectAssetCard(assetCardId, userId);
    await logDecision({ userId, assetCardId, actionType: 'reject' });

    return NextResponse.json({ success: true, assetCardId });
  } catch (error) {
    return handleError(error);
  }
}
