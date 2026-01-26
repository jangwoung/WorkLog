/**
 * Request validation schemas for API endpoints
 * Used by validation middleware to ensure request payloads are valid
 */

export interface RepositoryConnectRequest {
  owner: string;
  name: string;
}

export interface ExportRequest {
  assetCardIds: string[];
  format: 'readme' | 'resume';
}

export interface AssetCardEditRequest {
  title?: string;
  description?: string;
  impact?: string;
  technologies?: string[];
  contributions?: string[];
  metrics?: string;
}

/**
 * Validate repository connect request
 */
export function validateRepositoryConnect(data: unknown): data is RepositoryConnectRequest {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const req = data as Partial<RepositoryConnectRequest>;
  return (
    typeof req.owner === 'string' &&
    req.owner.length > 0 &&
    typeof req.name === 'string' &&
    req.name.length > 0
  );
}

/**
 * Validate export request
 */
export function validateExportRequest(data: unknown): data is ExportRequest {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const req = data as Partial<ExportRequest>;
  return (
    Array.isArray(req.assetCardIds) &&
    req.assetCardIds.length > 0 &&
    req.assetCardIds.every((id) => typeof id === 'string' && id.length > 0) &&
    (req.format === 'readme' || req.format === 'resume')
  );
}

/**
 * Validate asset card edit request
 */
export function validateAssetCardEdit(data: unknown): data is AssetCardEditRequest {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const req = data as Partial<AssetCardEditRequest>;
  
  // At least one field must be provided
  const hasFields = 
    req.title !== undefined ||
    req.description !== undefined ||
    req.impact !== undefined ||
    req.technologies !== undefined ||
    req.contributions !== undefined ||
    req.metrics !== undefined;

  if (!hasFields) {
    return false;
  }

  // Validate each field if provided
  if (req.title !== undefined && (typeof req.title !== 'string' || req.title.length === 0 || req.title.length > 100)) {
    return false;
  }

  if (req.description !== undefined && (typeof req.description !== 'string' || req.description.length === 0 || req.description.length > 500)) {
    return false;
  }

  if (req.impact !== undefined && (typeof req.impact !== 'string' || req.impact.length === 0 || req.impact.length > 300)) {
    return false;
  }

  if (req.technologies !== undefined) {
    if (!Array.isArray(req.technologies) || req.technologies.length === 0 || req.technologies.length > 10) {
      return false;
    }
    if (!req.technologies.every((tech) => typeof tech === 'string' && tech.length > 0)) {
      return false;
    }
  }

  if (req.contributions !== undefined) {
    if (!Array.isArray(req.contributions) || req.contributions.length === 0 || req.contributions.length > 5) {
      return false;
    }
    if (!req.contributions.every((contrib) => typeof contrib === 'string' && contrib.length > 0)) {
      return false;
    }
  }

  if (req.metrics !== undefined && (typeof req.metrics !== 'string' || req.metrics.length > 200)) {
    return false;
  }

  return true;
}
