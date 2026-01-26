import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/src/middleware/auth.middleware';
import { handleError } from '@/src/middleware/error.middleware';
import { disconnectRepository } from '@/src/services/repository/repository.service';
import { getUserById } from '@/src/services/auth/auth.service';
import { logger } from '@/src/utils/logger';

interface RouteParams {
  params: {
    repositoryId: string;
  };
}

/**
 * DELETE /api/repositories/[repositoryId]
 * Disconnect a repository and stop monitoring PR events
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { userId } = authResult;
    const { repositoryId } = params;

    // Get user to retrieve OAuth token
    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'User not found' } },
        { status: 404 }
      );
    }

    // Disconnect repository
    await disconnectRepository({
      userId,
      repositoryId,
      oauthToken: user.oauthToken, // TODO: Decrypt token
    });

    // Get disconnected timestamp (approximate)
    const disconnectedAt = new Date().toISOString();

    return NextResponse.json({
      success: true,
      repositoryId,
      disconnectedAt,
    });
  } catch (error) {
    return handleError(error);
  }
}
