import { Timestamp } from '@google-cloud/firestore';
import { getAgentRunsCollection } from '@/src/infrastructure/firestore/collections';
import { getIntentByIdUnsafe } from '@/src/services/intent/intent.service';
import { getReviewOutputByRunId } from '@/src/services/review-output/review-output.service';

export interface KPISummaryParams {
  from?: string; // ISO8601
  to?: string;   // ISO8601
}

export interface KPISummaryResult {
  linkRate: number;
  approvalRate: number;
  auditSuccessRate: number;
  period: { from: string; to: string };
}

/** Default to last 30 days if from/to not provided. */
function defaultPeriod(params: KPISummaryParams): { from: Date; to: Date } {
  const to = params.to ? new Date(params.to) : new Date();
  const from = params.from ? new Date(params.from) : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
  return { from, to };
}

export async function getKPISummary(params: KPISummaryParams): Promise<KPISummaryResult> {
  const { from, to } = defaultPeriod(params);
  const snapshot = await getAgentRunsCollection()
    .orderBy('createdAt', 'desc')
    .limit(500)
    .get();

  const runs = snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((r) => {
      const t = (r.createdAt as Timestamp).toDate();
      return t >= from && t <= to;
    });

  const total = runs.length;
  const withIntent = runs.filter((r) => r.intentId).length;
  let medHighTotal = 0;
  let medHighWithApproval = 0;
  let noDeficitCount = 0;

  for (const run of runs) {
    const intent = run.intentId ? await getIntentByIdUnsafe(run.intentId) : null;
    const requiresApproval = intent && (intent.riskLevel === 'Med' || intent.riskLevel === 'High');
    if (requiresApproval) {
      medHighTotal += 1;
      if (run.approvalId) medHighWithApproval += 1;
    }
    const hasReview = (run.status === 'completed' || run.status === 'failed') ? await getReviewOutputByRunId(run.id) : null;
    const deficit = !intent || (requiresApproval && !run.approvalId) || ((run.status === 'completed' || run.status === 'failed') && !hasReview);
    if (!deficit) noDeficitCount += 1;
  }

  const linkRate = total === 0 ? 0 : withIntent / total;
  const approvalRate = medHighTotal === 0 ? 0 : medHighWithApproval / medHighTotal;
  const auditSuccessRate = total === 0 ? 0 : noDeficitCount / total;

  return {
    linkRate,
    approvalRate,
    auditSuccessRate,
    period: { from: from.toISOString(), to: to.toISOString() },
  };
}
