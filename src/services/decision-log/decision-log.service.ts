import { getDecisionLogsCollection } from '@/src/infrastructure/firestore/collections';
import type { DecisionLog, ActionType, EditedField } from '@/src/models/decision-log.model';
import { Timestamp } from '@google-cloud/firestore';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export interface LogDecisionParams {
  userId: string;
  assetCardId: string;
  actionType: ActionType;
  editedFields?: Record<string, EditedField>;
}

/**
 * Append a decision log entry for approve/reject/edit.
 * Every approve, edit, or reject from the asset-card service should call this.
 */
export async function logDecision(params: LogDecisionParams): Promise<DecisionLog> {
  const { userId, assetCardId, actionType, editedFields } = params;
  const col = getDecisionLogsCollection();
  const ref = col.doc();
  const now = Timestamp.now();

  const data: Omit<DecisionLog, 'decisionLogId'> = {
    userId,
    assetCardId,
    actionType,
    timestamp: now,
    ...(editedFields && Object.keys(editedFields).length > 0 && { editedFields }),
  };

  await ref.set({ ...data, decisionLogId: ref.id });
  return { decisionLogId: ref.id, ...data };
}

export interface ListByUserOptions {
  limit?: number;
  cursor?: string;
}

export interface ListByUserResult {
  decisionLogs: DecisionLog[];
  nextCursor: string | null;
  hasMore: boolean;
}

/**
 * List decision logs for a user, newest first.
 */
export async function listByUserId(
  userId: string,
  options: ListByUserOptions = {}
): Promise<ListByUserResult> {
  const { limit = DEFAULT_PAGE_SIZE, cursor } = options;
  const take = Math.min(Math.max(1, limit), MAX_PAGE_SIZE);

  const col = getDecisionLogsCollection();
  let q = col
    .where('userId', '==', userId)
    .orderBy('timestamp', 'desc')
    .limit(take + 1);

  if (cursor) {
    const cursorDoc = await col.doc(cursor).get();
    if (cursorDoc.exists) {
      q = col
        .where('userId', '==', userId)
        .orderBy('timestamp', 'desc')
        .startAfter(cursorDoc)
        .limit(take + 1);
    }
  }

  const snap = await q.get();
  const docs = snap.docs.slice(0, take);
  const decisionLogs = docs.map((d) => ({ ...d.data(), decisionLogId: d.id } as DecisionLog));
  const hasMore = snap.docs.length > take;
  const nextCursor = hasMore && docs.length > 0 ? docs[docs.length - 1].id : null;

  return { decisionLogs, nextCursor, hasMore };
}

/**
 * List decision logs for an AssetCard, scoped by userId so only the owner can query.
 */
export async function listByAssetCardId(
  assetCardId: string,
  userId: string
): Promise<DecisionLog[]> {
  const col = getDecisionLogsCollection();
  const snap = await col
    .where('assetCardId', '==', assetCardId)
    .where('userId', '==', userId)
    .orderBy('timestamp', 'desc')
    .get();

  return snap.docs.map((d) => ({ ...d.data(), decisionLogId: d.id } as DecisionLog));
}
