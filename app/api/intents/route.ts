import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/src/middleware/auth.middleware';
import { handleError } from '@/src/middleware/error.middleware';
import { createIntent, listIntents } from '@/src/services/intent/intent.service';

function parseBody(body: unknown): {
  goal: string;
  constraints: Record<string, unknown> | unknown[];
  success: string;
  prMeta?: {
    repoFullName: string;
    prNumber: number;
    prUrl: string;
    baseSHA: string;
    headSHA: string;
    diffHash: string;
  };
} | null {
  if (!body || typeof body !== 'object') return null;
  const o = body as Record<string, unknown>;
  const goal = o.goal;
  const success = o.success;
  if (typeof goal !== 'string' || goal.trim() === '' || typeof success !== 'string') return null;
  const constraints = o.constraints;
  const constraintsOk =
    constraints === undefined ||
    constraints === null ||
    (typeof constraints === 'object' && (Array.isArray(constraints) || Object.prototype.toString.call(constraints) === '[object Object]'));
  if (!constraintsOk) return null;
  const constraintsVal = constraints == null ? {} : constraints;
  const prMeta = o.prMeta;
  let parsedPrMeta: {
    repoFullName: string;
    prNumber: number;
    prUrl: string;
    baseSHA: string;
    headSHA: string;
    diffHash: string;
  } | undefined;
  if (prMeta && typeof prMeta === 'object' && !Array.isArray(prMeta)) {
    const p = prMeta as Record<string, unknown>;
    if (
      typeof p.repoFullName === 'string' &&
      typeof p.prNumber === 'number' &&
      typeof p.prUrl === 'string' &&
      typeof p.baseSHA === 'string' &&
      typeof p.headSHA === 'string' &&
      typeof p.diffHash === 'string'
    ) {
      parsedPrMeta = {
        repoFullName: p.repoFullName,
        prNumber: p.prNumber,
        prUrl: p.prUrl,
        baseSHA: p.baseSHA,
        headSHA: p.headSHA,
        diffHash: p.diffHash,
      };
    }
  }
  return {
    goal: goal.trim(),
    constraints: Array.isArray(constraintsVal) ? (constraintsVal as unknown[]) : (constraintsVal as Record<string, unknown>),
    success: success.trim(),
    prMeta: parsedPrMeta,
  };
}

/**
 * POST /api/intents — Create Intent (002 AI Review MVP)
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
        { error: { code: 'INVALID_INPUT', message: 'goal, success required; constraints object or array' } },
        { status: 400 }
      );
    }

    const result = await createIntent({ creatorId: userId, input });
    return NextResponse.json(
      { intentId: result.intentId, riskLevel: result.riskLevel, requiresApproval: result.requiresApproval },
      { status: 201 }
    );
  } catch (error) {
    return handleError(error);
  }
}

/**
 * GET /api/intents — List current user's intents
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') ?? '50', 10) || 50, 100);
    const intents = await listIntents(userId, limit);
    return NextResponse.json({
      intents: intents.map((i) => ({
        intentId: i.intentId,
        goal: i.goal,
        constraints: i.constraints,
        success: i.success,
        riskLevel: i.riskLevel,
        requiresApproval: i.requiresApproval,
        createdAt: i.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return handleError(error);
  }
}
