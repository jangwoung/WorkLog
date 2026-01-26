import { Firestore } from '@google-cloud/firestore';

/**
 * Initialize and export Firestore client instance
 * Uses GOOGLE_APPLICATION_CREDENTIALS environment variable for authentication
 */
let firestoreClient: Firestore | null = null;

export function getFirestoreClient(): Firestore {
  if (!firestoreClient) {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT;
    if (!projectId) {
      throw new Error('GOOGLE_CLOUD_PROJECT environment variable is required');
    }

    firestoreClient = new Firestore({
      projectId,
      // Uses GOOGLE_APPLICATION_CREDENTIALS for authentication
      // or default credentials from gcloud SDK
    });
  }

  return firestoreClient;
}
