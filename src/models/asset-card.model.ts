import { Timestamp } from '@google-cloud/firestore';

export type AssetCardStatus = 'inbox' | 'flagged' | 'approved' | 'edited' | 'exported';
export type ExportFormat = 'readme' | 'resume';

export interface EditHistoryEntry {
  timestamp: Timestamp;
  field: string;
  oldValue: string;
  newValue: string;
}

export interface AssetCard {
  assetCardId: string; // Firestore document ID
  userId: string;
  prEventId: string;
  repositoryId: string;
  status: AssetCardStatus;
  title: string; // Max 100 chars
  description: string; // Max 500 chars
  impact: string; // Max 300 chars
  technologies: string[]; // Max 10 items
  contributions: string[]; // Max 5 items
  metrics?: string; // Max 200 chars
  validationErrors?: string[]; // Required when status = "flagged"
  schemaVersion: string;
  generatedAt: Timestamp;
  approvedAt?: Timestamp;
  editedAt?: Timestamp;
  editHistory?: EditHistoryEntry[];
  exportedAt?: Timestamp;
  exportFormats?: ExportFormat[];
}
