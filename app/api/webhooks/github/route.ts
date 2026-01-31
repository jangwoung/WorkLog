import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { ingestPREvent } from '@/src/services/pr-event/pr-event.service';
import { getRepositoriesCollection } from '@/src/infrastructure/firestore/collections';
import { enqueueTask } from '@/src/infrastructure/cloud-tasks/client';
import { logger } from '@/src/utils/logger';
import { handleError } from '@/src/middleware/error.middleware';
import type { Repository } from '@/src/models/repository.model';

/**
 * POST /api/webhooks/github
 * GitHub webhook receiver for PR events
 * Returns 200 immediately and enqueues Cloud Task for processing
 */
export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature
    const signature = request.headers.get('X-Hub-Signature-256');
    const deliveryId = request.headers.get('X-GitHub-Delivery');
    const eventType = request.headers.get('X-GitHub-Event');

    if (!signature || !deliveryId) {
      logger.warn('Missing webhook headers', { signature: !!signature, deliveryId: !!deliveryId });
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Missing required headers' } },
        { status: 401 }
      );
    }

    // Verify signature
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET || '';
    if (!webhookSecret) {
      logger.error('GITHUB_WEBHOOK_SECRET not configured');
      return NextResponse.json(
        { error: { code: 'INTERNAL_SERVER_ERROR', message: 'Webhook secret not configured' } },
        { status: 500 }
      );
    }

    const body = await request.text();
    const expectedSignature = `sha256=${createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex')}`;

    if (signature !== expectedSignature) {
      logger.warn('Invalid webhook signature', { deliveryId });
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Invalid signature' } },
        { status: 401 }
      );
    }

    // Only process pull_request events
    if (eventType !== 'pull_request') {
      logger.info('Ignoring non-PR event', { eventType, deliveryId });
      return NextResponse.json({ received: true });
    }

    // Parse webhook payload
    const payload = JSON.parse(body);
    const repositoryFullName = payload.repository?.full_name;

    if (!repositoryFullName) {
      logger.warn('Missing repository information in webhook', { deliveryId });
      return NextResponse.json(
        { error: { code: 'BAD_REQUEST', message: 'Missing repository information' } },
        { status: 400 }
      );
    }

    // Find repository by full name
    const repositoriesCollection = getRepositoriesCollection();
    const repoQuery = await repositoriesCollection
      .where('fullName', '==', repositoryFullName)
      .where('connectionStatus', '==', 'connected')
      .limit(1)
      .get();

    if (repoQuery.empty) {
      logger.info('Repository not connected, ignoring webhook', {
        repositoryFullName,
        deliveryId,
      });
      return NextResponse.json({ received: true });
    }

    const doc = repoQuery.docs[0];
    const repo = { ...doc.data(), repositoryId: doc.id } as Repository;

    // Ingest PR event (idempotent)
    const prEvent = await ingestPREvent({
      userId: repo.userId,
      repositoryId: repo.repositoryId,
      webhookPayload: payload as any,
      githubEventId: deliveryId,
    });

    // Enqueue PR event processor task (which will then enqueue asset-generator)
    // Use deliveryId for idempotency
    try {
      const prProcessorUrl =
        process.env.PR_EVENT_PROCESSOR_WORKER_URL ||
        `${process.env.NEXTAUTH_URL}/api/tasks/pr-event-processor`;

      await enqueueTask({
        queueName: process.env.CLOUD_TASKS_QUEUE_NAME || 'pr-event-processing',
        location: process.env.CLOUD_TASKS_LOCATION || 'us-central1',
        url: prProcessorUrl,
        taskName: `pr-event-processor-${deliveryId}`, // Idempotency key
        payload: {
          prEventId: prEvent.prEventId,
          userId: repo.userId,
          repositoryId: repo.repositoryId,
        },
      });

      logger.info('PR event processor task enqueued', {
        prEventId: prEvent.prEventId,
        deliveryId,
      });
    } catch (error) {
      logger.error('Failed to enqueue PR event processor task', error, {
        prEventId: prEvent.prEventId,
        deliveryId,
      });
      // Continue - event is stored, can be processed later
    }

    // Return 200 immediately (do not wait for processing)
    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error('Webhook processing error', error);
    return handleError(error);
  }
}
