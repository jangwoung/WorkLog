import { NextRequest, NextResponse } from 'next/server';
import { generateAssetCardFromPrEvent } from '@/src/services/asset-card/asset-card.service';
import { logger } from '@/src/utils/logger';
import { handleError } from '@/src/middleware/error.middleware';

/**
 * Asset Generator Worker
 * HTTP handler invoked by Cloud Tasks
 * Runs LLM pipeline and creates AssetCard
 */

interface TaskPayload {
  prEventId: string;
  userId: string;
  repositoryId: string;
}

/**
 * Generate AssetCard from PR event
 */
export async function POST(request: NextRequest) {
  try {
    const payload: TaskPayload = await request.json();
    const { prEventId } = payload;

    logger.info('Asset generator started', { prEventId });

    // Generate AssetCard (handles LLM pipeline, validation, storage)
    const assetCard = await generateAssetCardFromPrEvent({ prEventId });

    logger.info('AssetCard generated successfully', {
      prEventId,
      assetCardId: assetCard.assetCardId,
      status: assetCard.status,
    });

    return NextResponse.json({
      success: true,
      assetCardId: assetCard.assetCardId,
      status: assetCard.status,
    });
  } catch (error) {
    logger.error('Asset generator error', error);
    return handleError(error);
  }
}
