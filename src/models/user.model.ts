import { Timestamp } from '@google-cloud/firestore';

export interface User {
  userId: string; // Firestore document ID
  githubUserId: string;
  githubUsername: string;
  githubEmail?: string;
  oauthToken: string; // Encrypted
  oauthRefreshToken?: string; // Encrypted
  oauthTokenExpiresAt?: Timestamp;
  connectedRepositoryIds: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
