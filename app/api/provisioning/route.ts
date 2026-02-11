import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/src/middleware/auth.middleware';
import { handleError } from '@/src/middleware/error.middleware';
import { validateAndEnqueueProvisioning } from '@/src/services/provisioning/provisioning.service';

function parseBody(body: unknown): { intentId: string; approvalId: string; repositoryName?: string; structureType?: string } | null {
  if (!body || typeof body !== 'object') return null;
  const o = body as Record<string, unknown>;
  const intentId = o.intentId;
  const approvalId = o.approvalId;
  if (typeof intentId !== 'string' || intentId.trim() === '') return null;
  if (typeof approvalId !== 'string' || approvalId.trim() === '') return null;
  const repositoryName = typeof o.repositoryName === 'string' ? o.repositoryName.trim() || undefined : undefined;
  const structureType = typeof o.structureType === 'string' ? o.structureType.trim() || undefined : undefined;
  return {
    intentId: intentId.trim(),
    approvalId: approvalId.trim(),
    repositoryName,
    structureType,
  };
}

/**
 * POST /api/provisioning
 * Trigger repository creation/initialization for an approved project intent. Returns 202; job runs asynchronously.
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    const body = await request.json().catch(() => null);
    const input = parseBody(body);
    if (!input) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: 'intentId and approvalId required' } },
        { status: 400 }
      );
    }

    const result = await validateAndEnqueueProvisioning({
      intentId: input.intentId,
      approvalId: input.approvalId,
      actorId: userId,
      repositoryName: input.repositoryName,
      structureType: input.structureType,
    });

    return NextResponse.json(
      { jobId: result.jobId, intentId: result.intentId, message: 'Provisioning enqueued' },
      { status: 202 }
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'INTENT_NOT_FOUND' || error.message === 'APPROVAL_NOT_FOUND') {
        return NextResponse.json(
          { error: { code: 'NOT_FOUND', message: error.message === 'INTENT_NOT_FOUND' ? 'Intent not found' : 'Approval not found' } },
          { status: 404 }
        );
      }
      if (
        error.message === 'APPROVAL_NOT_APPROVED' ||
        error.message === 'APPROVAL_EXPIRED'
      ) {
        return NextResponse.json(
          { error: { code: 'INVALID_INPUT', message: 'Approval not approved or expired' } },
          { status: 400 }
        );
      }
    }
    return handleError(error);
  }
}
