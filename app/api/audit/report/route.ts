import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/src/middleware/auth.middleware';
import { handleError } from '@/src/middleware/error.middleware';
import { generateAuditReport } from '@/src/services/audit-report/audit-report.service';

/**
 * GET /api/audit/report — Generate audit report (002 AC-04). Query: from, to (required), scope (optional).
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const from = request.nextUrl.searchParams.get('from');
    const to = request.nextUrl.searchParams.get('to');
    const scopeRepo = request.nextUrl.searchParams.get('scope') || undefined;

    if (!from?.trim() || !to?.trim()) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: 'Query params from and to are required (ISO8601)' } },
        { status: 400 }
      );
    }

    const result = await generateAuditReport({
      from: from.trim(),
      to: to.trim(),
      scope: scopeRepo ? { repo: scopeRepo } : undefined,
    });

    const accept = request.headers.get('accept') || '';
    if (accept.includes('application/json')) {
      return NextResponse.json({ markdown: result.markdown, successMetric: result.successMetric });
    }
    return new NextResponse(result.markdown, {
      status: 200,
      headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'INVALID_DATE_RANGE' || error.message === 'FROM_AFTER_TO') {
        return NextResponse.json(
          { error: { code: 'INVALID_INPUT', message: 'from and to must be valid ISO8601 dates; from must be before to' } },
          { status: 400 }
        );
      }
    }
    return handleError(error);
  }
}
