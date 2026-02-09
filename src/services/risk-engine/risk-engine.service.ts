/**
 * Risk engine (MVP) — static rules for Low/Med/High (002 AI Review MVP)
 * Invoked on Intent create or AgentRun create.
 */

export type RiskLevel = 'Low' | 'Med' | 'High';

export interface RiskResult {
  riskLevel: RiskLevel;
  reason: string;
  requiresApproval: boolean;
}

export interface RiskEngineInput {
  goal?: string;
  constraints?: Record<string, unknown> | unknown[];
  repoFullName?: string;
  prNumber?: number;
  diffHash?: string;
}

/**
 * MVP: static rules. Med if constraints mention "security" or repo contains "sec";
 * High if explicitly high-risk keywords; otherwise Low.
 */
export function evaluateRisk(input: RiskEngineInput): RiskResult {
  const goal = (input.goal ?? '').toLowerCase();
  const repo = (input.repoFullName ?? '').toLowerCase();
  const constraintsStr = JSON.stringify(input.constraints ?? {}).toLowerCase();

  if (goal.includes('security') || repo.includes('sec') || constraintsStr.includes('security')) {
    return {
      riskLevel: 'High',
      reason: 'Security-related goal or repo',
      requiresApproval: true,
    };
  }

  if (
    goal.includes('compliance') ||
    goal.includes('audit') ||
    constraintsStr.includes('compliance') ||
    constraintsStr.includes('audit')
  ) {
    return {
      riskLevel: 'Med',
      reason: 'Compliance or audit scope',
      requiresApproval: true,
    };
  }

  return {
    riskLevel: 'Low',
    reason: 'Default',
    requiresApproval: false,
  };
}
