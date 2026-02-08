import { NextResponse } from 'next/server';
import {
  validateRepositoryConnect,
  validateExportRequest,
  validateAssetCardEdit,
  type RepositoryConnectRequest,
  type ExportRequest,
  type AssetCardEditRequest,
} from '@/src/schemas/validation.schemas';

/** Consistent error format for validation failures */
const VALIDATION_ERROR_RESPONSE = (
  message: string
): NextResponse =>
  NextResponse.json(
    { error: { code: 'VALIDATION_ERROR', message } },
    { status: 400 }
  );

/**
 * Validate repository connect body.
 * Returns parsed data or NextResponse (400) on failure.
 */
export function validateRepositoryConnectBody(
  body: unknown
): RepositoryConnectRequest | NextResponse {
  if (!validateRepositoryConnect(body)) {
    return VALIDATION_ERROR_RESPONSE(
      'Invalid request: owner and name (non-empty strings) are required'
    );
  }
  return body as RepositoryConnectRequest;
}

/**
 * Validate export request body.
 * Returns parsed data or NextResponse (400) on failure.
 */
export function validateExportBody(body: unknown): ExportRequest | NextResponse {
  if (!validateExportRequest(body)) {
    return VALIDATION_ERROR_RESPONSE(
      'Invalid request: assetCardIds (array of 1–50 string IDs) and format (readme|resume) are required'
    );
  }
  return body as ExportRequest;
}

/**
 * Validate asset card edit body.
 * Returns parsed data or NextResponse (400) on failure.
 */
export function validateAssetCardEditBody(
  body: unknown
): AssetCardEditRequest | NextResponse {
  if (!validateAssetCardEdit(body)) {
    return VALIDATION_ERROR_RESPONSE(
      'Invalid request: at least one editable field (title, description, impact, technologies, contributions, metrics) is required with valid format'
    );
  }
  return body as AssetCardEditRequest;
}
