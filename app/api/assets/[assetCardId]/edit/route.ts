import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/src/middleware/auth.middleware';
import { handleError } from '@/src/middleware/error.middleware';
import { validateAssetCardEditBody } from '@/src/middleware/validation.middleware';
import { editAssetCard } from '@/src/services/asset-card/asset-card.service';
import { logDecision } from '@/src/services/decision-log/decision-log.service';
import { serializeAssetCardForApi } from '@/src/utils/asset-card-serializer';

/**
 * POST /api/assets/:assetCardId/edit
 * Apply partial edits to an AssetCard (inbox or flagged); log decision with editedFields.
 */
export async function POST(
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

    const body = await request.json().catch(() => ({}));
    const validated = validateAssetCardEditBody(body);
    if (validated instanceof Response) {
      return validated;
    }

    const card = await editAssetCard(assetCardId, userId, validated);

    const editedFields =
      card.editHistory && card.editHistory.length > 0
        ? (() => {
            const lastEdit = card.editHistory![card.editHistory!.length - 1];
            const lastTs = lastEdit.timestamp.toMillis();
            const entries = (card.editHistory || []).filter((e) => e.timestamp.toMillis() === lastTs);
            const rec: Record<string, { oldValue: string; newValue: string }> = {};
            for (const e of entries) {
              rec[e.field] = { oldValue: e.oldValue, newValue: e.newValue };
            }
            return Object.keys(rec).length ? rec : undefined;
          })()
        : undefined;

    await logDecision({
      userId,
      assetCardId,
      actionType: 'edit',
      editedFields,
    });

    return NextResponse.json({
      assetCardId: card.assetCardId,
      status: card.status,
      editedAt: card.editedAt?.toDate().toISOString(),
      editHistory: (card.editHistory || []).map((e) => ({
        timestamp: e.timestamp.toDate().toISOString(),
        field: e.field,
        oldValue: e.oldValue,
        newValue: e.newValue,
      })),
    });
  } catch (error) {
    return handleError(error);
  }
}
