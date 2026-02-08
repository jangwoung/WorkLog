import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/src/middleware/auth.middleware';
import { handleError, AppError } from '@/src/middleware/error.middleware';
import { validateExportBody } from '@/src/middleware/validation.middleware';
import { runExport } from '@/src/services/export/export.service';
import { logger } from '@/src/utils/logger';

/**
 * POST /api/export
 * Export approved/edited AssetCards to readme (markdown) or resume (bullets) format.
 */
export async function POST(request: NextRequest) {
  let userId: string | undefined;

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    userId = authResult.userId;

    const body = await request.json().catch(() => ({}));
    const validated = validateExportBody(body);
    if (validated instanceof Response) {
      return validated;
    }

    const result = await runExport(validated.assetCardIds, validated.format, userId);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AppError) {
      return handleError(error);
    }
    logger.error('Export failed', error as Error, { userId });
    return NextResponse.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: 'Export failed' } },
      { status: 500 }
    );
  }
}
