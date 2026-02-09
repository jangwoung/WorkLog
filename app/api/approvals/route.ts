import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/src/middleware/auth.middleware';
import { handleError } from '@/src/middleware/error.middleware';
import { createApproval } from '@/src/services/approval/approval.service';
import type { ApprovalStatus } from '@/src/models/approval.model';

function parseBody(body: unknown): {
  intentId: string;
  status: ApprovalStatus;
  templateAnswers: Record<string, unknown>;
  validTo: string;
} | null {
  if (!body || typeof body !== 'object') return null;
  const o = body as Record<string, unknown>;
  const intentId = o.intentId;
  const status = o.status;
  const validTo = o.validTo;
  if (typeof intentId !== 'string' || intentId.trim() === '') return null;
  if (status !== 'approved' && status !== 'rejected' && status !== 'sent_back') return null;
  if (typeof validTo !== 'string' || validTo.trim() === '') return null;
  const templateAnswers = o.templateAnswers;
  const ta =
    templateAnswers != null && typeof templateAnswers === 'object' && !Array.isArray(templateAnswers)
      ? (templateAnswers as Record<string, unknown>)
      : {};
  return { intentId: intentId.trim(), status, templateAnswers: ta, validTo: validTo.trim() };
}

/**
 * POST /api/approvals — Create Approval (002 AI Review MVP)
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
        { error: { code: 'INVALID_INPUT', message: 'intentId, status (approved|rejected|sent_back), validTo required' } },
        { status: 400 }
      );
    }

    const result = await createApproval({ approverId: userId, input });
    return NextResponse.json(
      { approvalId: result.approvalId, intentId: result.intentId, validTo: result.validTo },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'INTENT_NOT_FOUND') {
        return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Intent not found' } }, { status: 404 });
      }
      if (error.message === 'INTENT_NOT_APPROVABLE') {
        return NextResponse.json(
          { error: { code: 'INVALID_INPUT', message: 'Intent does not require approval or is not Med/High' } },
          { status: 400 }
        );
      }
      if (error.message === 'INVALID_VALID_TO') {
        return NextResponse.json(
          { error: { code: 'INVALID_INPUT', message: 'validTo must be valid ISO8601' } },
          { status: 400 }
        );
      }
    }
    return handleError(error);
  }
}
