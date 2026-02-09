/**
 * ReviewOutput — Fixed-schema result of an AgentRun (002 AI Review MVP)
 * data-model: review_outputs collection (or subcollection under agent_runs)
 */
export interface Finding {
  id: string;
  category: string;
  severity: string;
  title: string;
  description: string;
  evidenceRef: string;
  recommendation: string;
  confidence?: number;
}

export interface ReviewOutput {
  summary: string;
  findings: Finding[];
  safeToProceed?: boolean;
  status: 'completed' | 'failed' | 'cancelled';
  errorCode?: string;
}
