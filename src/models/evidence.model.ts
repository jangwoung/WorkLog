/**
 * Evidence — Artifact linked to AgentRun or Intent (002 AI Review MVP)
 * data-model: evidences collection
 */
export interface Evidence {
  evidenceId: string;
  linkedType: string;
  linkedId: string;
  kind: string;
  url?: string;
  hash?: string;
  createdAt: Date;
}

export interface EvidenceCreateInput {
  linkedType: string;
  linkedId: string;
  kind: string;
  url?: string;
  hash?: string;
}
