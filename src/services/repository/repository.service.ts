import { getRepositoriesCollection, getUsersCollection } from '@/src/infrastructure/firestore/collections';
import { createGitHubClient } from '@/src/infrastructure/github/client';
import { getUserById, updateUserConnectedRepos } from '../auth/auth.service';
import type { Repository, ConnectionStatus } from '@/src/models/repository.model';
import { Timestamp } from '@google-cloud/firestore';
import { logger } from '@/src/utils/logger';
import { Errors } from '@/src/middleware/error.middleware';

/**
 * Repository service for managing GitHub repository connections
 */

export interface ConnectRepositoryOptions {
  userId: string;
  owner: string;
  name: string;
  oauthToken: string;
  webhookUrl: string;
  webhookSecret: string;
}

export interface DisconnectRepositoryOptions {
  userId: string;
  repositoryId: string;
  oauthToken: string;
}

/**
 * Connect a GitHub repository for PR event monitoring
 */
export async function connectRepository(
  options: ConnectRepositoryOptions
): Promise<Repository> {
  const { userId, owner, name, oauthToken, webhookUrl, webhookSecret } = options;

  try {
    // Get user to verify access
    const user = await getUserById(userId);
    if (!user) {
      throw Errors.notFound('User not found');
    }

    // Check if repository is already connected
    const repositoriesCollection = getRepositoriesCollection();
    const existingRepoQuery = await repositoriesCollection
      .where('userId', '==', userId)
      .where('fullName', '==', `${owner}/${name}`)
      .limit(1)
      .get();

    if (!existingRepoQuery.empty) {
      const existingRepo = existingRepoQuery.docs[0].data() as Repository;
      if (existingRepo.connectionStatus === 'connected') {
        throw Errors.conflict('Repository is already connected');
      }
    }

    // Create GitHub client and fetch repository info
    const githubClient = createGitHubClient(oauthToken);
    const repos = await githubClient.listRepositories();
    const repo = repos.find((r) => r.full_name === `${owner}/${name}`);

    if (!repo) {
      throw Errors.forbidden('Repository not found or user does not have access');
    }

    // Create webhook (skip on 403/422 or unreachable URL so dev/localhost or restricted orgs can still connect)
    let webhookId: number | undefined;
    let webhookSecretToStore: string | undefined;
    try {
      webhookId = await githubClient.createWebhook(owner, name, webhookUrl, webhookSecret);
      webhookSecretToStore = webhookSecret || undefined;
    } catch (error) {
      const status = (error as { status?: number })?.status;
      const msg = (error as Error)?.message ?? '';
      const isUnreachableUrl =
        status === 422 || String(msg).includes("isn't reachable over the public Internet") || String(msg).includes('localhost');
      const isForbidden =
        status === 403 || String(msg).includes('Resource not accessible by integration');
      const skipWebhook = isUnreachableUrl || isForbidden;
      if (skipWebhook) {
        logger.warn('Webhook creation skipped (unreachable URL or insufficient permissions)', {
          userId,
          owner,
          name,
          reason: isUnreachableUrl ? 'unreachable_url' : 'forbidden',
          message: msg,
        });
      } else {
        logger.error('Failed to create webhook', error, { userId, owner, name });
        throw Errors.internal('Failed to create webhook', error);
      }
    }

    // Store repository in Firestore (omit undefined to satisfy Firestore)
    const now = Timestamp.now();
    const repositoryData = {
      userId,
      githubRepoId: repo.id,
      owner: repo.owner.login,
      name: repo.name,
      fullName: repo.full_name,
      isPrivate: repo.private,
      connectionStatus: 'connected' as ConnectionStatus,
      connectedAt: now,
      ...(webhookId != null && { webhookId }),
      ...(webhookSecretToStore != null && webhookSecretToStore !== '' && { webhookSecret: webhookSecretToStore }),
    };

    let repositoryId: string;
    if (!existingRepoQuery.empty) {
      // Update existing repository
      const existingRepoDoc = existingRepoQuery.docs[0];
      repositoryId = existingRepoDoc.id;
      await existingRepoDoc.ref.update({
        ...repositoryData,
        disconnectedAt: null,
      });
    } else {
      // Create new repository
      const newRepoRef = repositoriesCollection.doc();
      repositoryId = newRepoRef.id;
      await newRepoRef.set({
        ...repositoryData,
        repositoryId,
      });
    }

    // Update user's connected repository IDs (user already loaded above)
    const currentIds = user.connectedRepositoryIds ?? [];
    const updatedRepoIds = currentIds.includes(repositoryId)
      ? currentIds
      : [...currentIds, repositoryId];
    await updateUserConnectedRepos(userId, updatedRepoIds);

    logger.info('Repository connected', { userId, repositoryId, fullName: `${owner}/${name}` });

    return {
      repositoryId,
      ...repositoryData,
    };
  } catch (error) {
    logger.error('Failed to connect repository', error, { userId, owner, name });
    throw error;
  }
}

/**
 * Disconnect a repository and stop monitoring PR events
 */
export async function disconnectRepository(
  options: DisconnectRepositoryOptions
): Promise<void> {
  const { userId, repositoryId, oauthToken } = options;

  try {
    // Get repository
    const repositoriesCollection = getRepositoriesCollection();
    const repoDoc = await repositoriesCollection.doc(repositoryId).get();

    if (!repoDoc.exists) {
      throw Errors.notFound('Repository not found');
    }

    const repo = { ...repoDoc.data(), repositoryId: repoDoc.id } as Repository;

    // Verify ownership
    if (repo.userId !== userId) {
      throw Errors.forbidden('Repository does not belong to user');
    }

    // Remove webhook if exists
    if (repo.webhookId && repo.connectionStatus === 'connected') {
      try {
        const githubClient = createGitHubClient(oauthToken);
        await githubClient.deleteWebhook(repo.owner, repo.name, repo.webhookId);
      } catch (error) {
        logger.warn('Failed to delete webhook', { userId, repositoryId, error });
        // Continue with disconnection even if webhook deletion fails
      }
    }

    // Update repository status
    await repoDoc.ref.update({
      connectionStatus: 'disconnected' as ConnectionStatus,
      disconnectedAt: Timestamp.now(),
    });

    // Update user's connected repository IDs
    const user = await getUserById(userId);
    if (user) {
      const updatedRepoIds = user.connectedRepositoryIds.filter((id) => id !== repositoryId);
      await updateUserConnectedRepos(userId, updatedRepoIds);
    }

    logger.info('Repository disconnected', { userId, repositoryId });
  } catch (error) {
    logger.error('Failed to disconnect repository', error, { userId, repositoryId });
    throw error;
  }
}

/**
 * Get user's connected repositories
 */
export async function getUserRepositories(userId: string): Promise<Repository[]> {
  try {
    const repositoriesCollection = getRepositoriesCollection();
    const query = await repositoriesCollection
      .where('userId', '==', userId)
      .where('connectionStatus', '==', 'connected')
      .get();

    return query.docs.map((doc) => ({
      ...doc.data(),
      repositoryId: doc.id,
    })) as Repository[];
  } catch (error) {
    logger.error('Failed to get user repositories', error, { userId });
    throw error;
  }
}
