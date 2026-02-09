import { Timestamp } from '@google-cloud/firestore';
import { getAgentRunsCollection } from '@/src/infrastructure/firestore/collections';
import { getIntentByIdUnsafe } from '@/src/services/intent/intent.service';
import { getApprovalById } from '@/src/services/approval/approval.service';
import { getReviewOutputByRunId } from '@/src/services/review-output/review-output.service';
import { listEvidencesByLink } from '@/src/services/evidence/evidence.service';
import { logger } from '@/src/utils/logger';

export interface AuditReportParams {
  from: string; // ISO8601
  to: string;   // ISO8601
  scope?: { repo?: string };
}

export interface AuditReportResult {
  markdown: string;
  successMetric: number; // 1 if no deficits, 0 otherwise
}

interface RunRow {
  runId: string;
  intentId: string;
  approvalId?: string;
  status: string;
  repoFullName: string;
  prNumber: number;
  prUrl: string;
  baseSHA: string;
  headSHA: string;
  diffHash: string;
  agentName: string;
  agentVersion: string;
  model: string;
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
  errorCode?: string;
}

/** Fetch runs in period; filter in memory to avoid composite index. */
async function getRunsInPeriod(from: Date, to: Date, scopeRepo?: string): Promise<RunRow[]> {
  const snapshot = await getAgentRunsCollection()
    .orderBy('createdAt', 'desc')
    .limit(500)
    .get();
  const rows: RunRow[] = [];
  for (const doc of snapshot.docs) {
    const d = doc.data();
    const createdAt = d.createdAt.toDate();
    if (createdAt < from || createdAt > to) continue;
    if (scopeRepo && d.repoFullName !== scopeRepo) continue;
    rows.push({
      runId: doc.id,
      intentId: d.intentId,
      approvalId: d.approvalId,
      status: d.status,
      repoFullName: d.repoFullName,
      prNumber: d.prNumber,
      prUrl: d.prUrl,
      baseSHA: d.baseSHA,
      headSHA: d.headSHA,
      diffHash: d.diffHash,
      agentName: d.agentName,
      agentVersion: d.agentVersion,
      model: d.model,
      createdAt: d.createdAt.toDate().toISOString(),
      startedAt: d.startedAt?.toDate().toISOString(),
      endedAt: d.endedAt?.toDate().toISOString(),
      errorCode: d.errorCode,
    });
  }
  rows.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
  return rows;
}

export async function generateAuditReport(params: AuditReportParams): Promise<AuditReportResult> {
  const from = new Date(params.from);
  const to = new Date(params.to);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new Error('INVALID_DATE_RANGE');
  }
  if (from > to) {
    throw new Error('FROM_AFTER_TO');
  }
  const scopeRepo = params.scope?.repo;
  const runs = await getRunsInPeriod(from, to, scopeRepo);
  const lines: string[] = [
    `# Audit Report`,
    ``,
    `**Period**: ${params.from} — ${params.to}`,
    scopeRepo ? `**Scope (repo)**: ${scopeRepo}` : '',
    `**Runs**: ${runs.length}`,
    ``,
    `---`,
    ``,
  ].filter(Boolean);

  let hasAnyDeficit = false;
  for (const run of runs) {
    const intent = await getIntentByIdUnsafe(run.intentId);
    const requiresApproval = intent?.riskLevel === 'Med' || intent?.riskLevel === 'High';
    const approval = run.approvalId ? await getApprovalById(run.approvalId) : null;
    const reviewOutput = await getReviewOutputByRunId(run.runId);
    const evidences = await listEvidencesByLink('agent_run', run.runId);

    const deficits: string[] = [];
    if (!intent) {
      deficits.push('intentId');
      hasAnyDeficit = true;
    }
    if (requiresApproval && !run.approvalId) {
      deficits.push('approvalId');
      hasAnyDeficit = true;
    }
    if (requiresApproval && run.approvalId && !approval) {
      deficits.push('approval (not found)');
      hasAnyDeficit = true;
    }
    if ((run.status === 'completed' || run.status === 'failed') && !reviewOutput) {
      deficits.push('reviewOutput');
      hasAnyDeficit = true;
    }

    lines.push(`## Run ${run.runId}`);
    lines.push(``);
    if (deficits.length > 0) {
      lines.push(`❗ **Missing**: ${deficits.join(', ')}`);
      lines.push(``);
    }
    lines.push(`- **Intent**: ${intent ? intent.goal : '(missing)'}`);
    lines.push(`- **Approval**: ${approval ? approval.status : requiresApproval ? '(missing)' : 'N/A (Low risk)'}`);
    lines.push(`- **AgentRun**: ${run.agentName} ${run.agentVersion} | ${run.model} | ${run.status}`);
    lines.push(`- **Repo**: ${run.repoFullName} #${run.prNumber}`);
    lines.push(`- **PR URL**: ${run.prUrl}`);
    lines.push(`- **diffHash**: ${run.diffHash}`);
    lines.push(`- **Time**: ${run.createdAt}${run.endedAt ? ` — ${run.endedAt}` : ''}`);
    if (reviewOutput) {
      lines.push(`- **Review**: ${reviewOutput.summary}`);
      const high = reviewOutput.findings.filter((f) => f.severity === 'high' || f.severity === 'critical');
      if (high.length > 0) {
        lines.push(`  - High-severity findings: ${high.map((f) => f.title).join('; ')}`);
      }
    }
    if (evidences.length > 0) {
      lines.push(`- **Evidence**: ${evidences.map((e) => `${e.kind}${e.url ? ` ${e.url}` : ''}${e.hash ? ` (${e.hash})` : ''}`).join('; ')}`);
    }
    lines.push(``);
  }

  if (runs.length === 0) {
    lines.push(`No runs in the selected period.`);
    lines.push(``);
  }

  lines.push(`---`);
  lines.push(``);
  lines.push(`**Report success metric**: ${hasAnyDeficit ? 0 : 1} (1 = no missing required links)`);

  logger.info('Audit report generated', { from: params.from, to: params.to, runCount: runs.length, successMetric: hasAnyDeficit ? 0 : 1 });
  return {
    markdown: lines.join('\n'),
    successMetric: hasAnyDeficit ? 0 : 1,
  };
}
