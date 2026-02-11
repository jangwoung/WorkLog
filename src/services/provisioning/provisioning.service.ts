import { Timestamp } from '@google-cloud/firestore';
import { getProvisioningEventsCollection } from '@/src/infrastructure/firestore/collections';
import { getIntentByIdUnsafe } from '@/src/services/intent/intent.service';
import { getApprovalById } from '@/src/services/approval/approval.service';
import { enqueueTask } from '@/src/infrastructure/cloud-tasks/client';
import { logger } from '@/src/utils/logger';
import type { ProvisioningEventCreateInput } from '@/src/models/provisioning-event.model';

export interface ValidateAndEnqueueOptions {
  intentId: string;
  approvalId: string;
  actorId: string;
  repositoryName?: string;
  structureType?: string;
}

export interface ValidateAndEnqueueResult {
  jobId: string;
  intentId: string;
}

/**
 * Validate intent and approval; enqueue provisioning task. Does not create repo in API.
 */
export async function validateAndEnqueueProvisioning(options: ValidateAndEnqueueOptions): Promise<ValidateAndEnqueueResult> {
  const { intentId, approvalId, actorId, repositoryName, structureType } = options;

  const intent = await getIntentByIdUnsafe(intentId);
  if (!intent) {
    throw new Error('INTENT_NOT_FOUND');
  }

  const approval = await getApprovalById(approvalId);
  if (!approval || approval.intentId !== intentId) {
    throw new Error('APPROVAL_NOT_FOUND');
  }
  if (approval.status !== 'approved') {
    throw new Error('APPROVAL_NOT_APPROVED');
  }
  if (approval.validTo < new Date()) {
    throw new Error('APPROVAL_EXPIRED');
  }

  const idempotencyKey = `provisioning-${intentId}-${structureType ?? 'default'}`;
  const provisioningUrl =
    process.env.PROVISIONING_WORKER_URL ||
    process.env.CLOUD_TASKS_HANDLER_URL?.replace(/\/api\/tasks\/[^/]+$/, '/api/tasks/provisioning') ||
    `${process.env.NEXTAUTH_URL}/api/tasks/provisioning`;

  await enqueueTask({
    queueName: process.env.CLOUD_TASKS_QUEUE_NAME || 'pr-event-processing',
    location: process.env.CLOUD_TASKS_LOCATION || 'asia-northeast1',
    url: provisioningUrl,
    taskName: idempotencyKey,
    payload: {
      intentId,
      approvalId,
      actorId,
      repositoryName: repositoryName ?? undefined,
      structureType: structureType ?? undefined,
    },
  });

  logger.info('Provisioning task enqueued', { intentId, approvalId, jobId: idempotencyKey });
  return { jobId: idempotencyKey, intentId };
}

/**
 * Record a provisioning event after successful repo creation/initialization (called from task handler).
 */
export async function recordProvisioningEvent(input: ProvisioningEventCreateInput): Promise<string> {
  const coll = getProvisioningEventsCollection();
  const ref = coll.doc();
  const now = Timestamp.now();
  await ref.set({
    eventId: ref.id,
    intentId: input.intentId,
    approvalId: input.approvalId,
    actorId: input.actorId,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    resourceUrl: input.resourceUrl,
    ...(input.structureType != null && { structureType: input.structureType }),
    createdAt: now,
  });
  logger.info('Provisioning event recorded', { eventId: ref.id, intentId: input.intentId });
  return ref.id;
}

export interface ListProvisioningEventsOptions {
  from?: string;
  to?: string;
  intentId?: string;
  limit?: number;
}

export interface ProvisioningEventListItem {
  eventId: string;
  intentId: string;
  approvalId: string;
  resourceUrl: string;
  structureType?: string;
  createdAt: string;
}

export async function listProvisioningEvents(options: ListProvisioningEventsOptions = {}): Promise<ProvisioningEventListItem[]> {
  const limit = Math.min(options.limit ?? 100, 200);
  const snapshot = await getProvisioningEventsCollection()
    .orderBy('createdAt', 'desc')
    .limit(500)
    .get();

  const from = options.from ? new Date(options.from) : null;
  const to = options.to ? new Date(options.to) : null;
  const intentIdFilter = options.intentId;

  const items: ProvisioningEventListItem[] = [];
  for (const d of snapshot.docs) {
    const data = d.data();
    const createdAt = data.createdAt.toDate();
    if (from && createdAt < from) continue;
    if (to && createdAt > to) continue;
    if (intentIdFilter && data.intentId !== intentIdFilter) continue;
    items.push({
      eventId: d.id,
      intentId: data.intentId,
      approvalId: data.approvalId,
      resourceUrl: data.resourceUrl,
      ...(data.structureType != null && { structureType: data.structureType }),
      createdAt: data.createdAt.toDate().toISOString(),
    });
    if (items.length >= limit) break;
  }

  return items;
}
