import { Timestamp } from '@google-cloud/firestore';
import { getAgentRunsCollection } from '@/src/infrastructure/firestore/collections';
import type { ReviewOutput } from '@/src/models/review-output.model';
import { saveReviewOutput } from '@/src/services/review-output/review-output.service';
import { logger } from '@/src/utils/logger';

/**
 * MVP: stub execution — no real AI. Produces a fixed ReviewOutput and saves it.
 * One execution = one AgentRun (AC-03). Updates status: queued → running → completed | failed.
 */
export async function executeRun(runId: string): Promise<{ status: 'completed' | 'failed'; errorCode?: string }> {
  const coll = getAgentRunsCollection();
  const ref = coll.doc(runId);
  const doc = await ref.get();
  if (!doc.exists) {
    throw new Error('RUN_NOT_FOUND');
  }
  const data = doc.data()!;
  if (data.status !== 'queued') {
    return { status: data.status as 'completed' | 'failed', errorCode: data.errorCode };
  }

  const now = Timestamp.now();
  await ref.update({
    status: 'running',
    startedAt: now,
    updatedAt: now,
  });
  logger.info('AgentRun started', { runId });

  try {
    // MVP stub: produce a fixed output
    const output: ReviewOutput = {
      summary: 'MVP stub review completed. No AI analysis performed.',
      findings: [
        {
          id: 'stub-1',
          category: 'governance',
          severity: 'low',
          title: 'Stub finding',
          description: 'This is a placeholder finding from the MVP executor.',
          evidenceRef: '',
          recommendation: 'Replace with real AI review integration.',
          confidence: 0.5,
        },
      ],
      safeToProceed: true,
      status: 'completed',
    };
    await saveReviewOutput(runId, output);
    await ref.update({
      status: 'completed',
      endedAt: now,
      toolsSummary: 'MVP stub (no tools)',
      updatedAt: now,
    });
    logger.info('AgentRun completed', { runId });
    return { status: 'completed' };
  } catch (err) {
    const errorCode = err instanceof Error ? 'executor_error' : 'unknown';
    await ref.update({
      status: 'failed',
      endedAt: now,
      errorCode,
      updatedAt: now,
    });
    logger.error('AgentRun failed', { runId, error: err });
    return { status: 'failed', errorCode };
  }
}
