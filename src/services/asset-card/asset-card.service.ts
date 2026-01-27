import { getAssetCardsCollection, getPREventsCollection } from '@/src/infrastructure/firestore/collections';
import { processDiff } from '@/src/utils/diff-processor';
import { checkAssetCardExists } from '@/src/utils/idempotency';
import { runLLMPipeline } from './llm-pipeline';
import type { AssetCard, AssetCardStatus } from '@/src/models/asset-card.model';
import type { PREvent, ProcessingStatus } from '@/src/models/pr-event.model';
import { Timestamp } from '@google-cloud/firestore';
import { ASSET_CARD_SCHEMA_VERSION } from '@/src/schemas/asset-card-schema';
import { logger } from '@/src/utils/logger';
import { Errors } from '@/src/middleware/error.middleware';

/**
 * AssetCard service for generation and orchestration
 * Handles LLM pipeline execution, validation, and storage
 */

export interface GenerateAssetCardOptions {
  prEventId: string;
}

/**
 * Generate AssetCard from PR event
 * Orchestrates diff processing, LLM pipeline, validation, and storage
 */
export async function generateAssetCardFromPrEvent(
  options: GenerateAssetCardOptions
): Promise<AssetCard> {
  const { prEventId } = options;

  try {
    // Check idempotency first
    const idempotencyCheck = await checkAssetCardExists(prEventId);
    if (idempotencyCheck.exists && idempotencyCheck.assetCard) {
      logger.info('AssetCard already exists, returning existing', {
        prEventId,
        assetCardId: idempotencyCheck.assetCard.assetCardId,
      });
      return idempotencyCheck.assetCard;
    }

    // Load PR event
    const prEventsCollection = getPREventsCollection();
    const prEventDoc = await prEventsCollection.doc(prEventId).get();

    if (!prEventDoc.exists) {
      throw Errors.notFound('PR event not found');
    }

    const prEvent: PREvent = {
      prEventId: prEventDoc.id,
      ...prEventDoc.data(),
    } as PREvent;

    // Verify PR event is in correct state
    if (prEvent.processingStatus !== 'pending' && prEvent.processingStatus !== 'processing') {
      throw Errors.badRequest(
        `PR event is not in processable state: ${prEvent.processingStatus}`
      );
    }

    // Process diff if available
    let diffContent = prEvent.diffContent || '';
    let diffStats = prEvent.diffStats;

    if (diffContent) {
      const processed = processDiff(diffContent);
      diffContent = processed.content;
      diffStats = processed.stats;
    }

    // Run LLM pipeline
    const llmResult = await runLLMPipeline({
      prEvent,
      diffContent,
      diffStats,
    });

    // Create AssetCard based on validation result
    const now = Timestamp.now();
    const assetCardsCollection = getAssetCardsCollection();
    const newAssetCardRef = assetCardsCollection.doc();

    let status: AssetCardStatus;
    let validationErrors: string[] | undefined;

    if (llmResult.valid) {
      status = 'inbox';
    } else {
      status = 'flagged';
      validationErrors = llmResult.errors;
    }

    const assetCardData: Omit<AssetCard, 'assetCardId'> = {
      userId: prEvent.userId,
      prEventId: prEvent.prEventId,
      repositoryId: prEvent.repositoryId,
      status,
      title: llmResult.assetCard.title,
      description: llmResult.assetCard.description,
      impact: llmResult.assetCard.impact,
      technologies: llmResult.assetCard.technologies,
      contributions: llmResult.assetCard.contributions,
      metrics: llmResult.assetCard.metrics,
      validationErrors,
      schemaVersion: ASSET_CARD_SCHEMA_VERSION,
      generatedAt: now,
    };

    await newAssetCardRef.set({
      ...assetCardData,
      assetCardId: newAssetCardRef.id,
    });

    const assetCard: AssetCard = {
      assetCardId: newAssetCardRef.id,
      ...assetCardData,
    };

    // Update PR event
    await prEventDoc.ref.update({
      assetCardId: assetCard.assetCardId,
      processingStatus: 'completed' as ProcessingStatus,
      processedAt: now,
    });

    logger.info('AssetCard generated', {
      prEventId,
      assetCardId: assetCard.assetCardId,
      status: assetCard.status,
    });

    return assetCard;
  } catch (error) {
    logger.error('Failed to generate AssetCard', error, { prEventId });

    // Update PR event status to failed
    try {
      const prEventsCollection = getPREventsCollection();
      await prEventsCollection.doc(prEventId).update({
        processingStatus: 'failed' as ProcessingStatus,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    } catch (updateError) {
      logger.error('Failed to update PR event status', updateError, { prEventId });
    }

    throw error;
  }
}
