import { CollectionReference } from '@google-cloud/firestore';
import { getFirestoreClient } from './client';
import type { User } from '../../models/user.model';
import type { Repository } from '../../models/repository.model';
import type { PREvent } from '../../models/pr-event.model';
import type { AssetCard } from '../../models/asset-card.model';
import type { DecisionLog } from '../../models/decision-log.model';

/**
 * Collection references for Firestore collections
 * All collections are scoped by userId for data isolation
 */

export function getUsersCollection(): CollectionReference<User> {
  return getFirestoreClient().collection('users') as CollectionReference<User>;
}

export function getRepositoriesCollection(): CollectionReference<Repository> {
  return getFirestoreClient().collection('repositories') as CollectionReference<Repository>;
}

export function getPREventsCollection(): CollectionReference<PREvent> {
  return getFirestoreClient().collection('pr-events') as CollectionReference<PREvent>;
}

export function getAssetCardsCollection(): CollectionReference<AssetCard> {
  return getFirestoreClient().collection('asset-cards') as CollectionReference<AssetCard>;
}

export function getDecisionLogsCollection(): CollectionReference<DecisionLog> {
  return getFirestoreClient().collection('decision-logs') as CollectionReference<DecisionLog>;
}
