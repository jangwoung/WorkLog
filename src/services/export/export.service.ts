import { getAssetCardsCollection } from '@/src/infrastructure/firestore/collections';
import type { AssetCard, ExportFormat } from '@/src/models/asset-card.model';
import { Timestamp } from '@google-cloud/firestore';
import { Errors } from '@/src/middleware/error.middleware';
import { logger } from '@/src/utils/logger';

const ALLOWED_STATUSES: AssetCard['status'][] = ['approved', 'edited'];

export interface ExportResult {
  format: ExportFormat;
  content: string;
  exportedAssetCardIds: string[];
  exportedAt: string; // ISO string
}

/**
 * Format a single AssetCard as README (markdown) section
 */
function formatCardAsReadmeSection(card: AssetCard): string {
  const parts: string[] = [`## ${card.title}`, '', card.description, ''];

  if (card.impact) {
    parts.push(`**Impact:** ${card.impact}`, '');
  }

  if (card.technologies && card.technologies.length > 0) {
    parts.push(`**Technologies:** ${card.technologies.join(', ')}`, '');
  }

  if (card.contributions && card.contributions.length > 0) {
    parts.push('**Contributions:**', ...card.contributions.map((c) => `- ${c}`), '');
  }

  if (card.metrics) {
    parts.push(`**Metrics:** ${card.metrics}`, '');
  }

  return parts.join('\n').trimEnd();
}

/**
 * Format a single AssetCard as resume bullet
 */
function formatCardAsResumeBullet(card: AssetCard): string {
  const main = card.description || card.title;
  const extras: string[] = [];
  if (card.impact) extras.push(card.impact);
  if (card.technologies?.length) extras.push(card.technologies.join(', '));
  const suffix = extras.length > 0 ? ` — ${extras.join(' · ')}` : '';
  return `- **${card.title}**${suffix}\n  ${main}`;
}

/**
 * Load AssetCards by ids, validate ownership and status (approved/edited).
 * Throws NOT_FOUND, FORBIDDEN, or BAD_REQUEST as appropriate.
 */
export async function runExport(
  assetCardIds: string[],
  format: ExportFormat,
  userId: string
): Promise<ExportResult> {
  const col = getAssetCardsCollection();
  const cards: AssetCard[] = [];
  const missing: string[] = [];
  const wrongOwner: string[] = [];
  const notExportable: string[] = [];

  for (const id of assetCardIds) {
    const doc = await col.doc(id).get();
    if (!doc.exists) {
      missing.push(id);
      continue;
    }
    const card = { ...doc.data(), assetCardId: doc.id } as AssetCard;
    if (card.userId !== userId) {
      wrongOwner.push(id);
      continue;
    }
    if (!ALLOWED_STATUSES.includes(card.status)) {
      notExportable.push(id);
      continue;
    }
    cards.push(card);
  }

  if (missing.length > 0) {
    throw Errors.notFound(`AssetCard(s) not found: ${missing.join(', ')}`);
  }
  if (wrongOwner.length > 0) {
    throw Errors.forbidden(`AssetCard(s) do not belong to user: ${wrongOwner.join(', ')}`);
  }
  if (notExportable.length > 0) {
    throw Errors.badRequest(
      'Only approved or edited AssetCards can be exported. Not exportable: ' +
        notExportable.join(', ')
    );
  }

  let content: string;
  if (format === 'readme') {
    content = cards.map(formatCardAsReadmeSection).join('\n---\n\n');
  } else {
    content = cards.map(formatCardAsResumeBullet).join('\n\n');
  }

  const now = Timestamp.now();
  const exportedIds = cards.map((c) => c.assetCardId);

  for (const card of cards) {
    const ref = col.doc(card.assetCardId);
    const existingFormats = card.exportFormats ?? [];
    const nextFormats = existingFormats.includes(format)
      ? existingFormats
      : [...existingFormats, format];
    await ref.update({
      exportedAt: now,
      exportFormats: nextFormats,
    });
  }

  logger.info('Export completed', { userId, format, count: exportedIds.length });

  return {
    format,
    content,
    exportedAssetCardIds: exportedIds,
    exportedAt: now.toDate().toISOString(),
  };
}
