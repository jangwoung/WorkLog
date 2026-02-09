/**
 * Approval — Risk acceptance for Med/High Intent (002 AI Review MVP)
 * data-model: approvals collection
 */
export type ApprovalStatus = 'approved' | 'rejected' | 'sent_back';

export interface Approval {
  approvalId: string;
  intentId: string;
  approverId: string;
  status: ApprovalStatus;
  templateAnswers: Record<string, unknown>;
  validFrom: Date;
  validTo: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApprovalCreateInput {
  intentId: string;
  status: ApprovalStatus;
  templateAnswers: Record<string, unknown>;
  validTo: string; // ISO8601
}
