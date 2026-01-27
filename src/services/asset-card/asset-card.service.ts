import { getAssetCardsCollection, getPREventsCollection } from '@/src/infrastructure/firestore/collections';
import { processDiff } from '@/src/utils/diff-processor';
import { checkAssetCardExists } from '@/src/utils/idempotency';
import { runLLMPipeline } from './llm-pipeline';
import type { AssetCard, AssetCardStatus, EditHistoryEntry } from '@/src/models/asset-card.model';
import type { PREvent, ProcessingStatus } from '@/src/models/pr-event.model';
import type { AssetCardEditRequest } from '@/src/schemas/validation.schemas';
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

// --- Phase 3: CRUD and state transitions ---

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export interface ListInboxOptions {
  userId: string;
  limit?: number;
  cursor?: string;
}

export interface ListInboxResult {
  assetCards: AssetCard[];
  nextCursor: string | null;
  hasMore: boolean;
}

export async function listInbox(options: ListInboxOptions): Promise<ListInboxResult> {
  const { userId, limit = DEFAULT_PAGE_SIZE, cursor } = options;
  const take = Math.min(Math.max(1, limit), MAX_PAGE_SIZE);

  const col = getAssetCardsCollection();
  let q = col
    .where('userId', '==', userId)
    .where('status', 'in', ['inbox', 'flagged'])
    .orderBy('generatedAt', 'desc')
    .limit(take + 1);

  if (cursor) {
    const cursorDoc = await col.doc(cursor).get();
    if (cursorDoc.exists) {
      q = col
        .where('userId', '==', userId)
        .where('status', 'in', ['inbox', 'flagged'])
        .orderBy('generatedAt', 'desc')
        .startAfter(cursorDoc)
        .limit(take + 1);
    }
  }

  const snap = await q.get();
  const docs = snap.docs.slice(0, take);
  const assetCards = docs.map((d) => ({ ...d.data(), assetCardId: d.id } as AssetCard));
  const hasMore = snap.docs.length > take;
  const nextCursor = hasMore && docs.length > 0 ? docs[docs.length - 1].id : null;

  return { assetCards, nextCursor, hasMore };
}

export interface ListLibraryOptions {
  userId: string;
  limit?: number;
  cursor?: string;
  status?: 'approved' | 'edited' | 'exported';
}

export interface ListLibraryResult {
  assetCards: AssetCard[];
  nextCursor: string | null;
  hasMore: boolean;
}

export async function listLibrary(options: ListLibraryOptions): Promise<ListLibraryResult> {
  const { userId, limit = DEFAULT_PAGE_SIZE, cursor, status } = options;
  const take = Math.min(Math.max(1, limit), MAX_PAGE_SIZE);

  const col = getAssetCardsCollection();
  const statuses = status ? [status] : ['approved', 'edited', 'exported'];

  let q = col
    .where('userId', '==', userId)
    .where('status', 'in', statuses)
    .orderBy('generatedAt', 'desc')
    .limit(take + 1);

  if (cursor) {
    const cursorDoc = await col.doc(cursor).get();
    if (cursorDoc.exists) {
      q = col
        .where('userId', '==', userId)
        .where('status', 'in', statuses)
        .orderBy('generatedAt', 'desc')
        .startAfter(cursorDoc)
        .limit(take + 1);
    }
  }

  const snap = await q.get();
  const docs = snap.docs.slice(0, take);
  const assetCards = docs.map((d) => ({ ...d.data(), assetCardId: d.id } as AssetCard));
  const hasMore = snap.docs.length > take;
  const nextCursor = hasMore && docs.length > 0 ? docs[docs.length - 1].id : null;

  return { assetCards, nextCursor, hasMore };
}

export async function getAssetCardById(assetCardId: string, userId: string): Promise<AssetCard | null> {
  const col = getAssetCardsCollection();
  const doc = await col.doc(assetCardId).get();
  if (!doc.exists) return null;
  const data = doc.data() as Omit<AssetCard, 'assetCardId'>;
  if (data.userId !== userId) return null;
  return { assetCardId: doc.id, ...data };
}

export async function approveAssetCard(assetCardId: string, userId: string): Promise<AssetCard> {
  const col = getAssetCardsCollection();
  const ref = col.doc(assetCardId);
  const doc = await ref.get();
  if (!doc.exists) throw Errors.notFound('AssetCard not found');
  const card = { ...doc.data(), assetCardId: doc.id } as AssetCard;
  if (card.userId !== userId) throw Errors.forbidden('Not owner');
  if (card.status !== 'inbox' && card.status !== 'flagged') {
    throw Errors.badRequest('Only inbox or flagged AssetCards can be approved');
  }

  const now = Timestamp.now();
  await ref.update({
    status: 'approved',
    approvedAt: now,
  });
  logger.info('AssetCard approved', { assetCardId, userId });
  return { ...card, status: 'approved' as AssetCardStatus, approvedAt: now };
}

export async function editAssetCard(
  assetCardId: string,
  userId: string,
  patch: AssetCardEditRequest
): Promise<AssetCard> {
  const col = getAssetCardsCollection();
  const ref = col.doc(assetCardId);
  const doc = await ref.get();
  if (!doc.exists) throw Errors.notFound('AssetCard not found');
  const card = { ...doc.data(), assetCardId: doc.id } as AssetCard;
  if (card.userId !== userId) throw Errors.forbidden('Not owner');
  if (card.status !== 'inbox' && card.status !== 'flagged') {
    throw Errors.badRequest('Only inbox or flagged AssetCards can be edited');
  }

  const now = Timestamp.now();
  const updates: Record<string, unknown> = { status: 'edited', editedAt: now };
  const editHistory: EditHistoryEntry[] = [...(card.editHistory || [])];

  if (patch.title !== undefined && patch.title !== card.title) {
    updates.title = patch.title;
    editHistory.push({ timestamp: now, field: 'title', oldValue: card.title, newValue: patch.title });
  }
  if (patch.description !== undefined && patch.description !== card.description) {
    updates.description = patch.description;
    editHistory.push({ timestamp: now, field: 'description', oldValue: card.description, newValue: patch.description });
  }
  if (patch.impact !== undefined && patch.impact !== card.impact) {
    updates.impact = patch.impact;
    editHistory.push({ timestamp: now, field: 'impact', oldValue: card.impact, newValue: patch.impact });
  }
  if (patch.technologies !== undefined && JSON.stringify(patch.technologies) !== JSON.stringify(card.technologies)) {
    updates.technologies = patch.technologies;
    editHistory.push({
      timestamp: now,
      field: 'technologies',
      oldValue: JSON.stringify(card.technologies),
      newValue: JSON.stringify(patch.technologies),
    });
  }
  if (patch.contributions !== undefined && JSON.stringify(patch.contributions) !== JSON.stringify(card.contributions)) {
    updates.contributions = patch.contributions;
    editHistory.push({
      timestamp: now,
      field: 'contributions',
      oldValue: JSON.stringify(card.contributions),
      newValue: JSON.stringify(patch.contributions),
    });
  }
  if (patch.metrics !== undefined && patch.metrics !== (card.metrics ?? '')) {
    updates.metrics = patch.metrics;
    editHistory.push({ timestamp: now, field: 'metrics', oldValue: card.metrics ?? '', newValue: patch.metrics });
  }

  updates.editHistory = editHistory;
  if (card.status === 'flagged' && (patch.title || patch.description || patch.impact || patch.technologies || patch.contributions || patch.metrics)) {
    updates.validationErrors = []; // clear after user fix
  }

  await ref.update(updates);
  logger.info('AssetCard edited', { assetCardId, userId });
  return { ...card, ...updates } as AssetCard;
}

export async function rejectAssetCard(assetCardId: string, userId: string): Promise<void> {
  const col = getAssetCardsCollection();
  const ref = col.doc(assetCardId);
  const doc = await ref.get();
  if (!doc.exists) throw Errors.notFound('AssetCard not found');
  const card = doc.data() as AssetCard;
  if (card.userId !== userId) throw Errors.forbidden('Not owner');
  if (card.status !== 'inbox' && card.status !== 'flagged') {
    throw Errors.badRequest('Only inbox or flagged AssetCards can be rejected');
  }

  await ref.delete();
  logger.info('AssetCard rejected (deleted)', { assetCardId, userId });
}
