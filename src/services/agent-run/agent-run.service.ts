import { Timestamp } from '@google-cloud/firestore';
import {
  getAgentRunsCollection,
  getExceptionEventsCollection,
} from '@/src/infrastructure/firestore/collections';
import type { AgentRunCreateInput } from '@/src/models/agent-run.model';
import { getApprovalById } from '@/src/services/approval/approval.service';
import { getIntentByIdUnsafe } from '@/src/services/intent/intent.service';
import { logger } from '@/src/utils/logger';

export interface CreateAgentRunOptions {
  actorId: string;
  input: AgentRunCreateInput;
}

/** Log unapproved attempt to exception_events (FR-EXC-01) */
async function logUnapprovedAttempt(params: {
  intentId: string;
  runId?: string;
  actorId: string;
}): Promise<void> {
  await getExceptionEventsCollection().add({
    type: 'unapproved_attempt',
    intentId: params.intentId,
    runId: params.runId,
    actorId: params.actorId,
    createdAt: Timestamp.now(),
  });
  logger.warn('Unapproved run attempt logged', { intentId: params.intentId, actorId: params.actorId });
}

export interface CreateAgentRunResult {
  runId: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  intentId: string;
  existing: boolean;
}

export async function createAgentRun(options: CreateAgentRunOptions): Promise<CreateAgentRunResult> {
  const { actorId, input } = options;
  const runId = input.runId?.trim() || undefined;

  if (!input.intentId?.trim()) {
    throw new Error('MISSING_INTENT_ID');
  }
  const intentId = input.intentId.trim();

  const intent = await getIntentByIdUnsafe(intentId);
  if (!intent) {
    throw new Error('INTENT_NOT_FOUND');
  }

  if (intent.riskLevel === 'Med' || intent.riskLevel === 'High') {
    const approvalId = input.approvalId?.trim();
    if (!approvalId) {
      await logUnapprovedAttempt({ intentId, runId: runId ?? undefined, actorId });
      throw new Error('APPROVAL_REQUIRED');
    }
    const approval = await getApprovalById(approvalId);
    if (!approval || approval.intentId !== intentId) {
      await logUnapprovedAttempt({ intentId, runId: runId ?? undefined, actorId });
      throw new Error('APPROVAL_NOT_FOUND');
    }
    if (approval.status !== 'approved') {
      await logUnapprovedAttempt({ intentId, runId: runId ?? undefined, actorId });
      throw new Error('APPROVAL_NOT_APPROVED');
    }
    if (approval.validTo < new Date()) {
      await logUnapprovedAttempt({ intentId, runId: runId ?? undefined, actorId });
      throw new Error('APPROVAL_EXPIRED');
    }
  }

  const coll = getAgentRunsCollection();
  const existingRunId = runId || null;
  if (existingRunId) {
    const existing = await coll.doc(existingRunId).get();
    if (existing.exists) {
      const d = existing.data()!;
      return {
        runId: existing.id,
        status: d.status as 'queued' | 'running' | 'completed' | 'failed',
        intentId: d.intentId,
        existing: true,
      };
    }
  }

  const now = Timestamp.now();
  const docId = existingRunId || coll.doc().id;
  const record = {
    intentId,
    approvalId: intent.riskLevel === 'Med' || intent.riskLevel === 'High' ? input.approvalId : undefined,
    actorType: 'user' as const,
    actorId,
    agentName: input.agentName,
    agentVersion: input.agentVersion,
    model: input.model,
    repoFullName: input.repoFullName,
    prNumber: input.prNumber,
    prUrl: input.prUrl,
    baseSHA: input.baseSHA,
    headSHA: input.headSHA,
    diffHash: input.diffHash,
    status: 'queued' as const,
    createdAt: now,
    updatedAt: now,
  };

  await coll.doc(docId).set(record);
  logger.info('AgentRun created', { runId: docId, intentId, actorId });
  return {
    runId: docId,
    status: 'queued',
    intentId,
    existing: false,
  };
}

export async function getAgentRunById(runId: string): Promise<{
  runId: string;
  intentId: string;
  approvalId?: string;
  status: string;
  repoFullName: string;
  prNumber: number;
  createdAt: string;
} | null> {
  const doc = await getAgentRunsCollection().doc(runId).get();
  if (!doc.exists) return null;
  const d = doc.data()!;
  return {
    runId: doc.id,
    intentId: d.intentId,
    approvalId: d.approvalId,
    status: d.status,
    repoFullName: d.repoFullName,
    prNumber: d.prNumber,
    createdAt: d.createdAt.toDate().toISOString(),
  };
}

export async function listAgentRuns(params?: { limit?: number }): Promise<Array<{
  runId: string;
  intentId: string;
  approvalId?: string;
  status: string;
  repoFullName: string;
  prNumber: number;
  createdAt: string;
}>> {
  const limit = Math.min(params?.limit ?? 50, 100);
  const snapshot = await getAgentRunsCollection()
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();
  return snapshot.docs.map((doc) => {
    const d = doc.data();
    return {
      runId: doc.id,
      intentId: d.intentId,
      approvalId: d.approvalId,
      status: d.status,
      repoFullName: d.repoFullName,
      prNumber: d.prNumber,
      createdAt: d.createdAt.toDate().toISOString(),
    };
  });
}
