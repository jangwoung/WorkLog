import { Timestamp } from '@google-cloud/firestore';

export type PREventType = 'opened' | 'synchronize' | 'closed' | 'merged';
export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface DiffStats {
  filesChanged: number;
  additions: number;
  deletions: number;
  totalLines: number;
}

export interface PREvent {
  prEventId: string; // Firestore document ID
  userId: string;
  repositoryId: string;
  prNumber: number;
  eventType: PREventType;
  prTitle: string;
  prDescription?: string;
  prAuthor: string;
  prUrl: string;
  diffContent?: string;
  diffStats?: DiffStats;
  processingStatus: ProcessingStatus;
  assetCardId?: string;
  errorMessage?: string;
  retryCount: number;
  githubEventId: string;
  receivedAt: Timestamp;
  processedAt?: Timestamp;
}
