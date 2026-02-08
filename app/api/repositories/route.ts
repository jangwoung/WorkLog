import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/src/middleware/auth.middleware';
import { handleError } from '@/src/middleware/error.middleware';
import { validateRepositoryConnectBody } from '@/src/middleware/validation.middleware';
import { getUserRepositories, connectRepository } from '@/src/services/repository/repository.service';
import { getUserById } from '@/src/services/auth/auth.service';
import { logger } from '@/src/utils/logger';

/**
 * GET /api/repositories
 * List user's connected repositories
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { userId } = authResult;
    const repositories = await getUserRepositories(userId);

    // Format response (exclude sensitive fields)
    const response = repositories.map((repo) => ({
      repositoryId: repo.repositoryId,
      githubRepoId: repo.githubRepoId,
      owner: repo.owner,
      name: repo.name,
      fullName: repo.fullName,
      isPrivate: repo.isPrivate,
      connectionStatus: repo.connectionStatus,
      connectedAt: repo.connectedAt.toDate().toISOString(),
      lastSyncTimestamp: repo.lastSyncTimestamp?.toDate().toISOString() || null,
    }));

    return NextResponse.json({ repositories: response });
  } catch (error) {
    return handleError(error);
  }
}

/**
 * POST /api/repositories
 * Connect a GitHub repository for PR event monitoring
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { userId } = authResult;

    // Parse and validate request body
    const body = await request.json().catch(() => ({}));
    const validated = validateRepositoryConnectBody(body);
    if (validated instanceof Response) {
      return validated;
    }

    // Get user to retrieve OAuth token
    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'User not found' } },
        { status: 404 }
      );
    }

    // Get webhook configuration
    const webhookUrl = process.env.GITHUB_WEBHOOK_URL || `${process.env.NEXTAUTH_URL}/api/webhooks/github`;
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET || '';

    if (!webhookSecret) {
      logger.warn('GITHUB_WEBHOOK_SECRET not configured', { userId });
    }

    // Connect repository
    const repository = await connectRepository({
      userId,
      owner: validated.owner,
      name: validated.name,
      oauthToken: user.oauthToken, // TODO: Decrypt token
      webhookUrl,
      webhookSecret,
    });

    // Format response (exclude sensitive fields)
    const response: Record<string, unknown> = {
      repositoryId: repository.repositoryId,
      githubRepoId: repository.githubRepoId,
      fullName: repository.fullName,
      connectionStatus: repository.connectionStatus,
      webhookId: repository.webhookId ?? null,
      connectedAt: repository.connectedAt.toDate().toISOString(),
    };
    if (repository.webhookId == null) {
      response.warning =
        'Webhook could not be installed (e.g. org restriction or insufficient scope). PR events will not be received automatically.';
    }

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
