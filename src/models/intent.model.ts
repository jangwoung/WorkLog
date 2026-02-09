/**
 * Intent — AI review request (002 AI Review MVP)
 * data-model: intents collection
 */
export interface Intent {
  intentId: string;
  goal: string;
  constraints: Record<string, unknown> | unknown[];
  success: string;
  riskLevel: 'Low' | 'Med' | 'High';
  requiresApproval: boolean;
  creatorId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IntentCreateInput {
  goal: string;
  constraints: Record<string, unknown> | unknown[];
  success: string;
  prMeta?: {
    repoFullName: string;
    prNumber: number;
    prUrl: string;
    baseSHA: string;
    headSHA: string;
    diffHash: string;
  };
}
