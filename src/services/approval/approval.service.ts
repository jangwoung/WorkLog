import { Timestamp } from '@google-cloud/firestore';
import { getApprovalsCollection, getIntentsCollection } from '@/src/infrastructure/firestore/collections';
import type { Approval, ApprovalCreateInput } from '@/src/models/approval.model';
import { getIntentByIdUnsafe } from '@/src/services/intent/intent.service';
import { logger } from '@/src/utils/logger';

export interface CreateApprovalOptions {
  approverId: string;
  input: ApprovalCreateInput;
}

export async function createApproval(options: CreateApprovalOptions): Promise<{
  approvalId: string;
  intentId: string;
  validTo: string;
}> {
  const { approverId, input } = options;
  const intent = await getIntentByIdUnsafe(input.intentId);
  if (!intent) {
    throw new Error('INTENT_NOT_FOUND');
  }
  if (!intent.requiresApproval || (intent.riskLevel !== 'Med' && intent.riskLevel !== 'High')) {
    throw new Error('INTENT_NOT_APPROVABLE');
  }

  const validToDate = new Date(input.validTo);
  if (Number.isNaN(validToDate.getTime())) {
    throw new Error('INVALID_VALID_TO');
  }
  const now = Timestamp.now();
  const validFrom = now;
  const validTo = Timestamp.fromDate(validToDate);

  const doc = {
    intentId: input.intentId,
    approverId,
    status: input.status,
    templateAnswers: input.templateAnswers ?? {},
    validFrom,
    validTo,
    createdAt: now,
    updatedAt: now,
  };

  const ref = await getApprovalsCollection().add(doc);
  logger.info('Approval created', { approvalId: ref.id, intentId: input.intentId, status: input.status, approverId });
  return {
    approvalId: ref.id,
    intentId: input.intentId,
    validTo: input.validTo,
  };
}

/** Get approval by ID; returns null if not found or not allowed */
export async function getApprovalById(approvalId: string): Promise<Approval | null> {
  const doc = await getApprovalsCollection().doc(approvalId).get();
  if (!doc.exists) return null;
  const data = doc.data();
  if (!data) return null;
  return {
    approvalId: doc.id,
    intentId: data.intentId,
    approverId: data.approverId,
    status: data.status,
    templateAnswers: data.templateAnswers,
    validFrom: data.validFrom.toDate(),
    validTo: data.validTo.toDate(),
    createdAt: data.createdAt.toDate(),
    updatedAt: data.updatedAt.toDate(),
  };
}

/** List intents that need approval and have no approval yet (inbox) */
export async function listApprovalInbox(userId: string): Promise<
  Array<{
    intentId: string;
    goal: string;
    riskLevel: 'Med' | 'High';
    createdAt: string;
  }>
> {
  const approvalsSnapshot = await getApprovalsCollection().get();
  const decidedIntentIds = new Set(approvalsSnapshot.docs.map((d) => d.data().intentId));

  const intentsSnapshot = await getIntentsCollection()
    .where('requiresApproval', '==', true)
    .get();

  const items: Array<{ intentId: string; goal: string; riskLevel: 'Med' | 'High'; createdAt: string }> = [];
  for (const doc of intentsSnapshot.docs) {
    const data = doc.data();
    if (data.riskLevel !== 'Med' && data.riskLevel !== 'High') continue;
    if (decidedIntentIds.has(doc.id)) continue;
    items.push({
      intentId: doc.id,
      goal: data.goal,
      riskLevel: data.riskLevel as 'Med' | 'High',
      createdAt: data.createdAt.toDate().toISOString(),
    });
  }
  items.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
  return items;
}
