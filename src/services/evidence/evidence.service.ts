import { Timestamp } from '@google-cloud/firestore';
import { getEvidencesCollection } from '@/src/infrastructure/firestore/collections';
import type { EvidenceCreateInput } from '@/src/models/evidence.model';
import { logger } from '@/src/utils/logger';

export async function createEvidence(input: EvidenceCreateInput): Promise<{
  evidenceId: string;
  linkedId: string;
  createdAt: Date;
}> {
  const coll = getEvidencesCollection();
  const doc = {
    linkedType: input.linkedType,
    linkedId: input.linkedId,
    kind: input.kind,
    ...(input.url != null && input.url !== '' && { url: input.url }),
    ...(input.hash != null && input.hash !== '' && { hash: input.hash }),
    createdAt: Timestamp.now(),
  };
  const ref = await coll.add(doc);
  const created = doc.createdAt as Timestamp;
  logger.info('Evidence created', { evidenceId: ref.id, linkedType: input.linkedType, linkedId: input.linkedId });
  return {
    evidenceId: ref.id,
    linkedId: input.linkedId,
    createdAt: created.toDate(),
  };
}

export async function listEvidencesByLink(linkedType: string, linkedId: string): Promise<Array<{
  evidenceId: string;
  kind: string;
  url?: string;
  hash?: string;
  createdAt: string;
}>> {
  const snapshot = await getEvidencesCollection()
    .where('linkedType', '==', linkedType)
    .where('linkedId', '==', linkedId)
    .get();
  const docs = snapshot.docs
    .map((d) => ({ doc: d, data: d.data() }))
    .sort((a, b) => b.data.createdAt.toMillis() - a.data.createdAt.toMillis());
  return docs.map(({ doc: d, data }) => ({
    evidenceId: d.id,
    kind: data.kind,
    url: data.url,
    hash: data.hash,
    createdAt: data.createdAt.toDate().toISOString(),
  }));
}
