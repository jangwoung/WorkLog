import { Timestamp } from '@google-cloud/firestore';

export type ActionType = 'approve' | 'reject' | 'edit';

export interface EditedField {
  oldValue: string;
  newValue: string;
}

export interface DecisionLog {
  decisionLogId: string; // Firestore document ID
  userId: string;
  assetCardId: string;
  actionType: ActionType;
  editedFields?: Record<string, EditedField>; // Required if actionType = "edit"
  timestamp: Timestamp;
}
