/**
 * ProvisioningEvent — GitHub resource creation/initialization evidence (003)
 * data-model: provisioning_events collection
 */
export interface ProvisioningEvent {
  eventId: string;
  intentId: string;
  approvalId: string;
  actorId: string;
  resourceType: string;
  resourceId: string;
  resourceUrl: string;
  structureType?: string;
  createdAt: Date;
}

export interface ProvisioningEventCreateInput {
  intentId: string;
  approvalId: string;
  actorId: string;
  resourceType: string;
  resourceId: string;
  resourceUrl: string;
  structureType?: string;
}
