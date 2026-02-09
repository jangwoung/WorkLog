/**
 * AgentRun — One AI review execution (002 AI Review MVP)
 * data-model: agent_runs collection
 */
export type AgentRunStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface AgentRun {
  runId: string;
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
  status: AgentRunStatus;
  startedAt?: Date;
  endedAt?: Date;
  toolsSummary?: string;
  costEstimate?: number;
  errorCode?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentRunCreateInput {
  runId?: string; // idempotency key when provided
  intentId: string;
  approvalId?: string;
  repoFullName: string;
  prNumber: number;
  prUrl: string;
  baseSHA: string;
  headSHA: string;
  diffHash: string;
  agentName: string;
  agentVersion: string;
  model: string;
}
