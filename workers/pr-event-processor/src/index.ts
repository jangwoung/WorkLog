import { NextRequest, NextResponse } from 'next/server';
import { getPREventsCollection, getRepositoriesCollection } from '@/src/infrastructure/firestore/collections';
import { createGitHubClient } from '@/src/infrastructure/github/client';
import { processDiff } from '@/src/utils/diff-processor';
import { enqueueTask } from '@/src/infrastructure/cloud-tasks/client';
import { getUserById } from '@/src/services/auth/auth.service';
import type { PREvent, ProcessingStatus } from '@/src/models/pr-event.model';
import type { Repository } from '@/src/models/repository.model';
import { Timestamp } from '@google-cloud/firestore';
import { logger } from '@/src/utils/logger';
import { handleError } from '@/src/middleware/error.middleware';

/**
 * PR Event Processor Worker
 * HTTP handler invoked by Cloud Tasks
 * Fetches PR + diff, processes diff, enqueues asset-generator task
 */

interface TaskPayload {
  prEventId: string;
  userId: string;
  repositoryId: string;
}

/**
 * Process PR event: fetch PR + diff, enqueue asset-generator
 */
export async function POST(request: NextRequest) {
  try {
    const payload: TaskPayload = await request.json();
    const { prEventId, userId, repositoryId } = payload;

    logger.info('PR event processor started', { prEventId, userId, repositoryId });

    // Load PR event
    const prEventsCollection = getPREventsCollection();
    const prEventDoc = await prEventsCollection.doc(prEventId).get();

    if (!prEventDoc.exists) {
      logger.warn('PR event not found', { prEventId });
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'PR event not found' } },
        { status: 404 }
      );
    }

    const prEvent: PREvent = {
      prEventId: prEventDoc.id,
      ...prEventDoc.data(),
    } as PREvent;

    // Verify repository is still connected and user has access
    const repositoriesCollection = getRepositoriesCollection();
    const repoDoc = await repositoriesCollection.doc(repositoryId).get();

    if (!repoDoc.exists) {
      logger.warn('Repository not found, marking PR event as failed', {
        prEventId,
        repositoryId,
      });
      await prEventDoc.ref.update({
        processingStatus: 'failed' as ProcessingStatus,
        errorMessage: 'Repository not found or disconnected',
      });
      return NextResponse.json({ processed: false, reason: 'repository_not_found' });
    }

    const repo = { repositoryId: repoDoc.id, ...repoDoc.data() } as Repository;

    if (repo.userId !== userId) {
      logger.warn('Repository access denied, marking PR event as failed', {
        prEventId,
        repositoryId,
        userId,
      });
      await prEventDoc.ref.update({
        processingStatus: 'failed' as ProcessingStatus,
        errorMessage: 'User does not have access to repository',
      });
      return NextResponse.json({ processed: false, reason: 'access_denied' });
    }

    if (repo.connectionStatus !== 'connected') {
      logger.warn('Repository not connected, marking PR event as failed', {
        prEventId,
        repositoryId,
        status: repo.connectionStatus,
      });
      await prEventDoc.ref.update({
        processingStatus: 'failed' as ProcessingStatus,
        errorMessage: 'Repository is not connected',
      });
      return NextResponse.json({ processed: false, reason: 'repository_not_connected' });
    }

    // Update PR event status to processing
    await prEventDoc.ref.update({
      processingStatus: 'processing' as ProcessingStatus,
    });

    // Get user to retrieve OAuth token
    const user = await getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Fetch PR and diff from GitHub
    const githubClient = createGitHubClient(user.oauthToken); // TODO: Decrypt token
    const pr = await githubClient.getPullRequest(repo.owner, repo.name, prEvent.prNumber);
    const diff = await githubClient.getPullRequestDiff(repo.owner, repo.name, prEvent.prNumber);

    // Process diff (truncate if needed)
    const processedDiff = processDiff(diff);
    const diffStats = processedDiff.stats;

    // Update PR event with diff content and stats
    await prEventDoc.ref.update({
      diffContent: processedDiff.content,
      diffStats,
    });

    // Enqueue asset-generator task
    const assetGeneratorUrl =
      process.env.ASSET_GENERATOR_WORKER_URL ||
      `${process.env.NEXTAUTH_URL}/api/tasks/asset-generator`;

    await enqueueTask({
      queueName: process.env.CLOUD_TASKS_QUEUE_NAME || 'pr-event-processing',
      location: process.env.CLOUD_TASKS_LOCATION || 'us-central1',
      taskName: `asset-generator-${prEventId}`, // Idempotency key
      payload: {
        prEventId,
        userId,
        repositoryId,
      },
    });

    logger.info('PR event processed, asset-generator enqueued', {
      prEventId,
      repositoryId,
    });

    return NextResponse.json({ processed: true, prEventId });
  } catch (error) {
    logger.error('PR event processor error', error);
    return handleError(error);
  }
}
