import { Timestamp } from '@google-cloud/firestore';
import {
  getExceptionEventsCollection,
  getApprovalsCollection,
} from '@/src/infrastructure/firestore/collections';
import { logger } from '@/src/utils/logger';

export type ExceptionEventType = 'unapproved_attempt' | 'break_glass' | 'approval_expired';

export interface LogBreakGlassParams {
  intentId?: string;
  runId?: string;
  actorId: string;
}

/** FR-EXC-02: Record break-glass run (post-hoc approval required) */
export async function logBreakGlass(params: LogBreakGlassParams): Promise<void> {
  await getExceptionEventsCollection().add({
    type: 'break_glass',
    intentId: params.intentId,
    runId: params.runId,
    actorId: params.actorId,
    createdAt: Timestamp.now(),
  });
  logger.warn('Break-glass run logged', { intentId: params.intentId, runId: params.runId, actorId: params.actorId });
}

export interface ExceptionInboxItem {
  type: ExceptionEventType;
  eventId: string;
  intentId?: string;
  runId?: string;
  actorId: string;
  resolution?: string;
  createdAt: string;
}

export interface ExpiredApprovalItem {
  approvalId: string;
  intentId: string;
  validTo: string;
  approverId: string;
}

/** List exception events (reject logs, break-glass). Optional type filter (applied in memory). */
export async function listExceptionEvents(params?: { type?: ExceptionEventType; limit?: number }): Promise<ExceptionInboxItem[]> {
  const limit = Math.min(params?.limit ?? 100, 200);
  const snapshot = await getExceptionEventsCollection()
    .orderBy('createdAt', 'desc')
    .limit(limit * 2)
    .get();
  let items = snapshot.docs.map((d) => {
    const data = d.data();
    return {
      type: data.type,
      eventId: d.id,
      intentId: data.intentId,
      runId: data.runId,
      actorId: data.actorId,
      resolution: data.resolution,
      createdAt: data.createdAt.toDate().toISOString(),
    };
  });
  if (params?.type) {
    items = items.filter((i) => i.type === params.type);
  }
  return items.slice(0, limit);
}

/** FR-EXC-03: List approvals that have expired (validTo < now) */
export async function listExpiredApprovals(limit = 50): Promise<ExpiredApprovalItem[]> {
  const now = Timestamp.now();
  const snapshot = await getApprovalsCollection()
    .where('validTo', '<', now)
    .orderBy('validTo', 'desc')
    .limit(limit)
    .get();
  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      approvalId: d.id,
      intentId: data.intentId,
      validTo: data.validTo.toDate().toISOString(),
      approverId: data.approverId,
    };
  });
}
