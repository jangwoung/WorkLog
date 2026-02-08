import { getPREventsCollection, getRepositoriesCollection } from '@/src/infrastructure/firestore/collections';
import type { PREvent, PREventType, ProcessingStatus } from '@/src/models/pr-event.model';
import type { Repository } from '@/src/models/repository.model';
import { Timestamp } from '@google-cloud/firestore';
import { logger } from '@/src/utils/logger';
import { Errors } from '@/src/middleware/error.middleware';

/**
 * PR Event service for ingesting GitHub webhook events
 * Handles storage and idempotency checks
 */

export interface GitHubWebhookPayload {
  action: string;
  pull_request: {
    number: number;
    title: string;
    body: string | null;
    user: { login: string };
    html_url: string;
    state: string;
    merged: boolean;
  };
  repository: {
    id: number;
    full_name: string;
    owner: { login: string };
    name: string;
  };
}

export interface IngestPREventOptions {
  userId: string;
  repositoryId: string;
  webhookPayload: GitHubWebhookPayload;
  githubEventId: string;
}

/**
 * Map GitHub webhook action to PREventType
 * reopened: PR を閉じた後に再度開いた場合。opened と同様に処理する。
 */
function mapEventType(action: string, merged: boolean): PREventType | null {
  if (action === 'opened' || action === 'reopened') {
    return 'opened';
  }
  if (action === 'synchronize') {
    return 'synchronize';
  }
  if (action === 'closed' && merged) {
    return 'merged';
  }
  if (action === 'closed' && !merged) {
    return 'closed';
  }
  return null;
}

/**
 * Ingest PR event from GitHub webhook
 * Validates repository connection and stores event with idempotency check
 */
export async function ingestPREvent(options: IngestPREventOptions): Promise<PREvent> {
  const { userId, repositoryId, webhookPayload, githubEventId } = options;

  try {
    // Verify repository is connected and belongs to user
    const repositoriesCollection = getRepositoriesCollection();
    const repoDoc = await repositoriesCollection.doc(repositoryId).get();

    if (!repoDoc.exists) {
      throw Errors.notFound('Repository not found');
    }

    const repo = { ...repoDoc.data(), repositoryId: repoDoc.id } as Repository;

    if (repo.userId !== userId) {
      throw Errors.forbidden('Repository does not belong to user');
    }

    if (repo.connectionStatus !== 'connected') {
      throw Errors.badRequest('Repository is not connected');
    }

    // Map event type
    const eventType = mapEventType(
      webhookPayload.action,
      webhookPayload.pull_request.merged
    );

    if (!eventType) {
      logger.info('Ignoring unsupported PR event action', {
        userId,
        repositoryId,
        action: webhookPayload.action,
      });
      throw Errors.badRequest(`Unsupported PR event action: ${webhookPayload.action}`);
    }

    // Check for existing event (idempotency)
    const prEventsCollection = getPREventsCollection();
    const existingEventQuery = await prEventsCollection
      .where('githubEventId', '==', githubEventId)
      .limit(1)
      .get();

    if (!existingEventQuery.empty) {
      const existingEvent = {
        ...existingEventQuery.docs[0].data(),
        prEventId: existingEventQuery.docs[0].id,
      } as PREvent;
      logger.info('Duplicate PR event detected, returning existing', {
        userId,
        repositoryId,
        githubEventId,
        prEventId: existingEvent.prEventId,
      });
      return existingEvent;
    }

    // Create PR event document (Firestore does not accept undefined; omit optional fields)
    const now = Timestamp.now();
    const prBody = webhookPayload.pull_request.body;
    const prEventData: Omit<PREvent, 'prEventId'> = {
      userId,
      repositoryId,
      prNumber: webhookPayload.pull_request.number,
      eventType,
      prTitle: webhookPayload.pull_request.title,
      ...(prBody != null && prBody !== '' && { prDescription: prBody }),
      prAuthor: webhookPayload.pull_request.user.login,
      prUrl: webhookPayload.pull_request.html_url,
      processingStatus: 'pending' as ProcessingStatus,
      retryCount: 0,
      githubEventId,
      receivedAt: now,
    };

    const newEventRef = prEventsCollection.doc();
    await newEventRef.set({
      ...prEventData,
      prEventId: newEventRef.id,
    });

    const prEvent: PREvent = {
      prEventId: newEventRef.id,
      ...prEventData,
    };

    logger.info('PR event ingested', {
      userId,
      repositoryId,
      prEventId: prEvent.prEventId,
      prNumber: prEvent.prNumber,
      eventType: prEvent.eventType,
      ...(webhookPayload.action === 'reopened' && { webhookAction: 'reopened' }),
    });

    return prEvent;
  } catch (error) {
    logger.error('Failed to ingest PR event', error, {
      userId,
      repositoryId,
      githubEventId,
    });
    throw error;
  }
}
