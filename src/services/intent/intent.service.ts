import { Timestamp } from '@google-cloud/firestore';
import { getIntentsCollection } from '@/src/infrastructure/firestore/collections';
import type { Intent, IntentCreateInput } from '@/src/models/intent.model';
import { evaluateRisk } from '@/src/services/risk-engine/risk-engine.service';
import { logger } from '@/src/utils/logger';

export interface CreateIntentOptions {
  creatorId: string;
  input: IntentCreateInput;
}

export async function createIntent(options: CreateIntentOptions): Promise<{
  intentId: string;
  riskLevel: 'Low' | 'Med' | 'High';
  requiresApproval: boolean;
}> {
  const { creatorId, input } = options;
  const risk = evaluateRisk({
    goal: input.goal,
    constraints: input.constraints,
    repoFullName: input.prMeta?.repoFullName,
    prNumber: input.prMeta?.prNumber,
    diffHash: input.prMeta?.diffHash,
  });

  const now = Timestamp.now();
  const doc = {
    goal: input.goal,
    constraints: input.constraints ?? {},
    success: input.success,
    riskLevel: risk.riskLevel,
    requiresApproval: risk.requiresApproval,
    creatorId,
    createdAt: now,
    updatedAt: now,
  };

  const ref = await getIntentsCollection().add(doc);
  logger.info('Intent created', { intentId: ref.id, riskLevel: risk.riskLevel, creatorId });
  return {
    intentId: ref.id,
    riskLevel: risk.riskLevel,
    requiresApproval: risk.requiresApproval,
  };
}

/** Get intent by ID without creator check (for internal use e.g. approval gate) */
export async function getIntentByIdUnsafe(intentId: string): Promise<Intent | null> {
  const doc = await getIntentsCollection().doc(intentId).get();
  if (!doc.exists) return null;
  const data = doc.data();
  if (!data) return null;
  return {
    intentId: doc.id,
    goal: data.goal,
    constraints: data.constraints,
    success: data.success,
    riskLevel: data.riskLevel,
    requiresApproval: data.requiresApproval,
    creatorId: data.creatorId,
    createdAt: data.createdAt.toDate(),
    updatedAt: data.updatedAt.toDate(),
  };
}

export async function getIntentById(intentId: string, userId: string): Promise<Intent | null> {
  const intent = await getIntentByIdUnsafe(intentId);
  if (!intent || intent.creatorId !== userId) return null;
  return intent;
}

export async function listIntents(userId: string, limit = 50): Promise<Intent[]> {
  const snapshot = await getIntentsCollection()
    .where('creatorId', '==', userId)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();

  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      intentId: d.id,
      goal: data.goal,
      constraints: data.constraints,
      success: data.success,
      riskLevel: data.riskLevel,
      requiresApproval: data.requiresApproval,
      creatorId: data.creatorId,
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
    } as Intent;
  });
}
