import { CollectionReference, Timestamp } from '@google-cloud/firestore';
import { getFirestoreClient } from './client';
import type { User } from '../../models/user.model';
import type { Repository } from '../../models/repository.model';
import type { PREvent } from '../../models/pr-event.model';
import type { AssetCard } from '../../models/asset-card.model';
import type { DecisionLog } from '../../models/decision-log.model';

/**
 * Collection references for Firestore collections
 * All collections are scoped by userId for data isolation
 */

export function getUsersCollection(): CollectionReference<User> {
  return getFirestoreClient().collection('users') as CollectionReference<User>;
}

export function getRepositoriesCollection(): CollectionReference<Repository> {
  return getFirestoreClient().collection('repositories') as CollectionReference<Repository>;
}

export function getPREventsCollection(): CollectionReference<PREvent> {
  return getFirestoreClient().collection('pr-events') as CollectionReference<PREvent>;
}

export function getAssetCardsCollection(): CollectionReference<AssetCard> {
  return getFirestoreClient().collection('asset-cards') as CollectionReference<AssetCard>;
}

export function getDecisionLogsCollection(): CollectionReference<DecisionLog> {
  return getFirestoreClient().collection('decision-logs') as CollectionReference<DecisionLog>;
}

// --- 002 AI Review MVP collections (data-model.md) ---

export interface IntentRecord {
  goal: string;
  constraints: Record<string, unknown> | unknown[];
  success: string;
  riskLevel: 'Low' | 'Med' | 'High';
  requiresApproval: boolean;
  creatorId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ApprovalRecord {
  intentId: string;
  approverId: string;
  status: 'approved' | 'rejected' | 'sent_back';
  templateAnswers: Record<string, unknown>;
  validFrom: Timestamp;
  validTo: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface AgentRunRecord {
  intentId: string;
  approvalId?: string;
  actorType: string;
  actorId: string;
  agentName: string;
  agentVersion: string;
  model: string;
  repoFullName: string;
  prNumber: number;
  prUrl: string;
  baseSHA: string;
  headSHA: string;
  diffHash: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt?: Timestamp;
  endedAt?: Timestamp;
  toolsSummary?: string;
  costEstimate?: number;
  errorCode?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ReviewOutputRecord {
  runId: string;
  summary: string;
  findings: Array<{
    id: string;
    category: string;
    severity: string;
    title: string;
    description: string;
    evidenceRef: string;
    recommendation: string;
    confidence?: number;
  }>;
  safeToProceed?: boolean;
  status: 'completed' | 'failed' | 'cancelled';
  errorCode?: string;
}

export interface EvidenceRecord {
  linkedType: string;
  linkedId: string;
  kind: string;
  url?: string;
  hash?: string;
  createdAt: Timestamp;
}

export interface ExceptionEventRecord {
  type: 'unapproved_attempt' | 'break_glass' | 'approval_expired';
  intentId?: string;
  runId?: string;
  actorId: string;
  resolution?: 'approved' | 'rejected' | 'sent_back';
  createdAt: Timestamp;
}

// --- 003 Project provisioning (data-model.md) ---

export interface ProvisioningEventRecord {
  eventId: string;
  intentId: string;
  approvalId: string;
  actorId: string;
  resourceType: string;
  resourceId: string;
  resourceUrl: string;
  structureType?: string;
  createdAt: Timestamp;
}

export function getProvisioningEventsCollection(): CollectionReference<ProvisioningEventRecord> {
  return getFirestoreClient().collection('provisioning_events') as CollectionReference<ProvisioningEventRecord>;
}

export function getIntentsCollection(): CollectionReference<IntentRecord> {
  return getFirestoreClient().collection('intents') as CollectionReference<IntentRecord>;
}

export function getApprovalsCollection(): CollectionReference<ApprovalRecord> {
  return getFirestoreClient().collection('approvals') as CollectionReference<ApprovalRecord>;
}

export function getAgentRunsCollection(): CollectionReference<AgentRunRecord> {
  return getFirestoreClient().collection('agent_runs') as CollectionReference<AgentRunRecord>;
}

export function getReviewOutputsCollection(): CollectionReference<ReviewOutputRecord> {
  return getFirestoreClient().collection('review_outputs') as CollectionReference<ReviewOutputRecord>;
}

export function getEvidencesCollection(): CollectionReference<EvidenceRecord> {
  return getFirestoreClient().collection('evidences') as CollectionReference<EvidenceRecord>;
}

export function getExceptionEventsCollection(): CollectionReference<ExceptionEventRecord> {
  return getFirestoreClient().collection('exception_events') as CollectionReference<ExceptionEventRecord>;
}
