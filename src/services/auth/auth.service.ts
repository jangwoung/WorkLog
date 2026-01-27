import { getUsersCollection } from '@/src/infrastructure/firestore/collections';
import type { User } from '@/src/models/user.model';
import { logger } from '@/src/utils/logger';

/**
 * Auth service for user management
 * Handles user retrieval and token management
 * Note: User creation/update is handled by NextAuth.js callbacks in route.ts
 */

/**
 * Get user by userId
 */
export async function getUserById(userId: string): Promise<User | null> {
  try {
    const usersCollection = getUsersCollection();
    const userDoc = await usersCollection.doc(userId).get();

    if (!userDoc.exists) {
      return null;
    }

    return { ...userDoc.data(), userId: userDoc.id } as User;
  } catch (error) {
    logger.error('Failed to get user by ID', error, { userId });
    throw error;
  }
}

/**
 * Get user by GitHub user ID
 */
export async function getUserByGitHubId(githubUserId: string): Promise<User | null> {
  try {
    const usersCollection = getUsersCollection();
    const query = await usersCollection
      .where('githubUserId', '==', githubUserId)
      .limit(1)
      .get();

    if (query.empty) {
      return null;
    }

    const userDoc = query.docs[0];
    return { ...userDoc.data(), userId: userDoc.id } as User;
  } catch (error) {
    logger.error('Failed to get user by GitHub ID', error, { githubUserId });
    throw error;
  }
}

/**
 * Update user's connected repository IDs
 */
export async function updateUserConnectedRepos(
  userId: string,
  repositoryIds: string[]
): Promise<void> {
  try {
    const usersCollection = getUsersCollection();
    await usersCollection.doc(userId).update({
      connectedRepositoryIds: repositoryIds,
      updatedAt: new Date(),
    });
    logger.info('Updated user connected repositories', { userId, count: repositoryIds.length });
  } catch (error) {
    logger.error('Failed to update user connected repositories', error, { userId });
    throw error;
  }
}
