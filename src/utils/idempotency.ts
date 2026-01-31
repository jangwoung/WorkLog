import { getAssetCardsCollection, getPREventsCollection } from '@/src/infrastructure/firestore/collections';
import type { PREvent } from '@/src/models/pr-event.model';
import type { AssetCard } from '@/src/models/asset-card.model';
import { logger } from '@/src/utils/logger';

/**
 * Idempotency helper for PR processing
 * Ensures one AssetCard per PR event, preventing duplicates from retries
 */

export interface IdempotencyCheckResult {
  exists: boolean;
  assetCard?: AssetCard;
  prEvent?: PREvent;
}

/**
 * Check if AssetCard already exists for a PR event
 * Uses prEventId (one-to-one relationship) for idempotency
 */
export async function checkAssetCardExists(prEventId: string): Promise<IdempotencyCheckResult> {
  try {
    const assetCardsCollection = getAssetCardsCollection();
    const query = await assetCardsCollection
      .where('prEventId', '==', prEventId)
      .limit(1)
      .get();

    if (!query.empty) {
      const assetCardDoc = query.docs[0];
      const assetCard: AssetCard = {
        ...assetCardDoc.data(),
        assetCardId: assetCardDoc.id,
      } as AssetCard;

      // Also fetch the PR event for context
      const prEventsCollection = getPREventsCollection();
      const prEventDoc = await prEventsCollection.doc(prEventId).get();
      const prEvent = prEventDoc.exists
        ? ({ ...prEventDoc.data(), prEventId: prEventDoc.id } as PREvent)
        : undefined;

      logger.info('AssetCard already exists for PR event', {
        prEventId,
        assetCardId: assetCard.assetCardId,
      });

      return {
        exists: true,
        assetCard,
        prEvent,
      };
    }

    return { exists: false };
  } catch (error) {
    logger.error('Failed to check AssetCard existence', error, { prEventId });
    throw error;
  }
}

/**
 * Check if PR event was already processed
 * Uses repositoryId + prNumber + eventType as idempotency key
 */
export async function checkPREventProcessed(
  repositoryId: string,
  prNumber: number,
  eventType: string
): Promise<boolean> {
  try {
    const prEventsCollection = getPREventsCollection();
    const query = await prEventsCollection
      .where('repositoryId', '==', repositoryId)
      .where('prNumber', '==', prNumber)
      .where('eventType', '==', eventType)
      .where('processingStatus', '==', 'completed')
      .limit(1)
      .get();

    return !query.empty;
  } catch (error) {
    logger.error('Failed to check PR event processing status', error, {
      repositoryId,
      prNumber,
      eventType,
    });
    throw error;
  }
}
