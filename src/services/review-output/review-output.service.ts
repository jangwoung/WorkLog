import { Timestamp } from '@google-cloud/firestore';
import { getReviewOutputsCollection } from '@/src/infrastructure/firestore/collections';
import type { ReviewOutput } from '@/src/models/review-output.model';
import { logger } from '@/src/utils/logger';

export async function saveReviewOutput(runId: string, output: ReviewOutput): Promise<string> {
  const coll = getReviewOutputsCollection();
  const doc = {
    runId,
    summary: output.summary,
    findings: output.findings.map((f) => ({
      id: f.id,
      category: f.category,
      severity: f.severity,
      title: f.title,
      description: f.description,
      evidenceRef: f.evidenceRef,
      recommendation: f.recommendation,
      ...(f.confidence != null && { confidence: f.confidence }),
    })),
    ...(output.safeToProceed != null && { safeToProceed: output.safeToProceed }),
    status: output.status,
    ...(output.errorCode && { errorCode: output.errorCode }),
  };
  const ref = await coll.add(doc);
  logger.info('ReviewOutput saved', { runId, outputId: ref.id, status: output.status });
  return ref.id;
}

export async function getReviewOutputByRunId(runId: string): Promise<ReviewOutput & { outputId: string } | null> {
  const snapshot = await getReviewOutputsCollection().where('runId', '==', runId).limit(1).get();
  if (snapshot.empty) return null;
  const d = snapshot.docs[0];
  const data = d.data();
  return {
    outputId: d.id,
    summary: data.summary,
    findings: data.findings,
    safeToProceed: data.safeToProceed,
    status: data.status,
    errorCode: data.errorCode,
  };
}
