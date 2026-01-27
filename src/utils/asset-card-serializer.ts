import type { AssetCard, EditHistoryEntry } from '@/src/models/asset-card.model';
import { Timestamp } from '@google-cloud/firestore';

function tsToIso(ts: Timestamp | undefined): string | null {
  return ts ? ts.toDate().toISOString() : null;
}

/**
 * Serialize AssetCard for API responses (Timestamps → ISO strings).
 * Include validationErrors when status is "flagged".
 */
export function serializeAssetCardForApi(card: AssetCard): Record<string, unknown> {
  const editHistory = (card.editHistory || []).map((e: EditHistoryEntry) => ({
    timestamp: tsToIso(e.timestamp),
    field: e.field,
    oldValue: e.oldValue,
    newValue: e.newValue,
  }));

  const out: Record<string, unknown> = {
    assetCardId: card.assetCardId,
    userId: card.userId,
    prEventId: card.prEventId,
    repositoryId: card.repositoryId,
    status: card.status,
    title: card.title,
    description: card.description,
    impact: card.impact,
    technologies: card.technologies,
    contributions: card.contributions,
    metrics: card.metrics ?? null,
    schemaVersion: card.schemaVersion,
    generatedAt: tsToIso(card.generatedAt),
    approvedAt: tsToIso(card.approvedAt),
    editedAt: tsToIso(card.editedAt),
    exportedAt: tsToIso(card.exportedAt),
    exportFormats: card.exportFormats ?? null,
    editHistory: editHistory.length > 0 ? editHistory : null,
  };

  if (card.status === 'flagged' && card.validationErrors) {
    out.validationErrors = card.validationErrors;
  }

  return out;
}
