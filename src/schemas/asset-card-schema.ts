/**
 * Fixed AssetCard schema for LLM validation
 * Ensures deterministic, reproducible outputs
 */

export interface AssetCardSchema {
  title: string; // Max 100 chars
  description: string; // Max 500 chars
  impact: string; // Max 300 chars
  technologies: string[]; // Max 10 items
  contributions: string[]; // Max 5 items
  metrics?: string; // Max 200 chars, optional
}

export const ASSET_CARD_SCHEMA_VERSION = '1.0.0';

const MAX_TITLE_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 500;
const MAX_IMPACT_LENGTH = 300;
const MAX_METRICS_LENGTH = 200;
const MAX_TECHNOLOGIES = 10;
const MAX_CONTRIBUTIONS = 5;

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validate AssetCard data against fixed schema
 * @param data AssetCard data to validate
 * @returns true if valid, false with errors if invalid
 */
export function validateAssetCard(data: unknown): { valid: boolean; errors?: ValidationError[] } {
  if (!data || typeof data !== 'object') {
    return {
      valid: false,
      errors: [{ field: 'root', message: 'AssetCard data must be an object' }],
    };
  }

  const card = data as Partial<AssetCardSchema>;
  const errors: ValidationError[] = [];

  // Validate title
  if (!card.title || typeof card.title !== 'string') {
    errors.push({ field: 'title', message: 'Title is required and must be a string' });
  } else if (card.title.length > MAX_TITLE_LENGTH) {
    errors.push({ field: 'title', message: `Title must be ${MAX_TITLE_LENGTH} characters or less` });
  }

  // Validate description
  if (!card.description || typeof card.description !== 'string') {
    errors.push({ field: 'description', message: 'Description is required and must be a string' });
  } else if (card.description.length > MAX_DESCRIPTION_LENGTH) {
    errors.push({ field: 'description', message: `Description must be ${MAX_DESCRIPTION_LENGTH} characters or less` });
  }

  // Validate impact
  if (!card.impact || typeof card.impact !== 'string') {
    errors.push({ field: 'impact', message: 'Impact is required and must be a string' });
  } else if (card.impact.length > MAX_IMPACT_LENGTH) {
    errors.push({ field: 'impact', message: `Impact must be ${MAX_IMPACT_LENGTH} characters or less` });
  }

  // Validate technologies
  if (!Array.isArray(card.technologies)) {
    errors.push({ field: 'technologies', message: 'Technologies must be an array' });
  } else {
    if (card.technologies.length === 0) {
      errors.push({ field: 'technologies', message: 'Technologies must contain at least one item' });
    } else if (card.technologies.length > MAX_TECHNOLOGIES) {
      errors.push({ field: 'technologies', message: `Technologies must contain ${MAX_TECHNOLOGIES} items or less` });
    } else if (!card.technologies.every((tech) => typeof tech === 'string')) {
      errors.push({ field: 'technologies', message: 'All technologies must be strings' });
    }
  }

  // Validate contributions
  if (!Array.isArray(card.contributions)) {
    errors.push({ field: 'contributions', message: 'Contributions must be an array' });
  } else {
    if (card.contributions.length === 0) {
      errors.push({ field: 'contributions', message: 'Contributions must contain at least one item' });
    } else if (card.contributions.length > MAX_CONTRIBUTIONS) {
      errors.push({ field: 'contributions', message: `Contributions must contain ${MAX_CONTRIBUTIONS} items or less` });
    } else if (!card.contributions.every((contrib) => typeof contrib === 'string')) {
      errors.push({ field: 'contributions', message: 'All contributions must be strings' });
    }
  }

  // Validate metrics (optional)
  if (card.metrics !== undefined) {
    if (typeof card.metrics !== 'string') {
      errors.push({ field: 'metrics', message: 'Metrics must be a string if provided' });
    } else if (card.metrics.length > MAX_METRICS_LENGTH) {
      errors.push({ field: 'metrics', message: `Metrics must be ${MAX_METRICS_LENGTH} characters or less` });
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}
