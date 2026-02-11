import { NextRequest, NextResponse } from 'next/server';
import { getProvisioningEventsCollection } from '@/src/infrastructure/firestore/collections';
import { createGitHubClient } from '@/src/infrastructure/github/client';
import { getUserById } from '@/src/services/auth/auth.service';
import { recordProvisioningEvent } from '@/src/services/provisioning/provisioning.service';
import { logger } from '@/src/utils/logger';
import { handleError } from '@/src/middleware/error.middleware';

/**
 * POST /api/tasks/provisioning
 * Cloud Tasks (003): create/initialize GitHub repo; write provisioning_events record. Idempotent by intentId+structureType.
 */
interface ProvisioningPayload {
  intentId: string;
  approvalId: string;
  actorId: string;
  repositoryName?: string;
  structureType?: string;
}

export async function POST(request: NextRequest) {
  try {
    const payload: ProvisioningPayload = await request.json().catch(() => ({}));
    const { intentId, approvalId, actorId, repositoryName, structureType } = payload;

    if (!intentId || !approvalId || !actorId) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: 'intentId, approvalId, actorId required' } },
        { status: 400 }
      );
    }

    logger.info('Provisioning task started', { intentId, approvalId, actorId });

    // Idempotency: skip if we already have a provisioning event for this intent (same scope)
    const existing = await getProvisioningEventsCollection()
      .where('intentId', '==', intentId)
      .limit(1)
      .get();
    if (!existing.empty) {
      logger.info('Provisioning already completed for intent (idempotent)', { intentId });
      return NextResponse.json({ ok: true, intentId, message: 'Already provisioned' });
    }

    const user = await getUserById(actorId);
    if (!user?.oauthToken) {
      logger.error('User or OAuth token not found', { actorId });
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'User token not available' } },
        { status: 401 }
      );
    }

    const gh = createGitHubClient(user.oauthToken);
    const repoName = repositoryName?.trim() || `worklog-${intentId.slice(0, 8)}`;

    const repo = await gh.createRepository({
      name: repoName,
      private: false,
      description: 'Provisioned by WorkLog',
    });

    await recordProvisioningEvent({
      intentId,
      approvalId,
      actorId,
      resourceType: 'repository',
      resourceId: String(repo.id),
      resourceUrl: repo.html_url,
      structureType: structureType ?? undefined,
    });

    logger.info('Provisioning completed', { intentId, resourceUrl: repo.html_url });
    return NextResponse.json({
      ok: true,
      intentId,
      resourceUrl: repo.html_url,
      resourceId: String(repo.id),
      structureType: structureType ?? null,
    });
  } catch (error) {
    logger.error('Provisioning task failed', error as Error);
    return handleError(error);
  }
}
