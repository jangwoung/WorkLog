import { Timestamp } from '@google-cloud/firestore';

export type ConnectionStatus = 'connected' | 'disconnected' | 'error';

export interface Repository {
  repositoryId: string; // Firestore document ID
  userId: string;
  githubRepoId: number;
  owner: string;
  name: string;
  fullName: string;
  isPrivate: boolean;
  connectionStatus: ConnectionStatus;
  webhookId?: number;
  webhookSecret?: string; // Encrypted
  lastSyncTimestamp?: Timestamp;
  connectedAt: Timestamp;
  disconnectedAt?: Timestamp;
}
