import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/src/middleware/auth.middleware';
import { handleError } from '@/src/middleware/error.middleware';
import {
  createAgentRun,
  listAgentRuns,
} from '@/src/services/agent-run/agent-run.service';
import { executeRun } from '@/src/services/agent-run/executor.service';
import type { AgentRunCreateInput } from '@/src/models/agent-run.model';

function parseBody(body: unknown): AgentRunCreateInput | null {
  if (!body || typeof body !== 'object') return null;
  const o = body as Record<string, unknown>;
  const runId = typeof o.runId === 'string' ? o.runId.trim() || undefined : undefined;
  const intentId = o.intentId;
  const approvalId = typeof o.approvalId === 'string' ? o.approvalId.trim() || undefined : undefined;
  const repoFullName = o.repoFullName;
  const prNumber = o.prNumber;
  const prUrl = o.prUrl;
  const baseSHA = o.baseSHA;
  const headSHA = o.headSHA;
  const diffHash = o.diffHash;
  const agentName = o.agentName;
  const agentVersion = o.agentVersion;
  const model = o.model;
  if (
    typeof intentId !== 'string' ||
    intentId.trim() === '' ||
    typeof repoFullName !== 'string' ||
    repoFullName.trim() === '' ||
    typeof prNumber !== 'number' ||
    typeof prUrl !== 'string' ||
    prUrl.trim() === '' ||
    typeof baseSHA !== 'string' ||
    baseSHA.trim() === '' ||
    typeof headSHA !== 'string' ||
    headSHA.trim() === '' ||
    typeof diffHash !== 'string' ||
    diffHash.trim() === '' ||
    typeof agentName !== 'string' ||
    agentName.trim() === '' ||
    typeof agentVersion !== 'string' ||
    agentVersion.trim() === '' ||
    typeof model !== 'string' ||
    model.trim() === ''
  ) {
    return null;
  }
  return {
    ...(runId ? { runId } : {}),
    intentId: intentId.trim(),
    approvalId,
    repoFullName: repoFullName.trim(),
    prNumber,
    prUrl: prUrl.trim(),
    baseSHA: baseSHA.trim(),
    headSHA: headSHA.trim(),
    diffHash: diffHash.trim(),
    agentName: agentName.trim(),
    agentVersion: agentVersion.trim(),
    model: model.trim(),
  };
}

/**
 * POST /api/agent-runs — Create AgentRun (gate: intentId required, Med/High approval) (002)
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
        { error: { code: 'INVALID_INPUT', message: 'intentId, repoFullName, prNumber, prUrl, baseSHA, headSHA, diffHash, agentName, agentVersion, model required' } },
        { status: 400 }
      );
    }

    const result = await createAgentRun({ actorId: userId, input });
    let status = result.status;
    if (!result.existing) {
      const exec = await executeRun(result.runId);
      status = exec.status;
    }
    const payload = { runId: result.runId, status, intentId: result.intentId };
    return NextResponse.json(payload, { status: result.existing ? 200 : 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'MISSING_INTENT_ID') {
        return NextResponse.json(
          { error: { code: 'INVALID_INPUT', message: 'intentId is required' } },
          { status: 400 }
        );
      }
      if (error.message === 'INTENT_NOT_FOUND') {
        return NextResponse.json(
          { error: { code: 'NOT_FOUND', message: 'Intent not found' } },
          { status: 404 }
        );
      }
      if (
        error.message === 'APPROVAL_REQUIRED' ||
        error.message === 'APPROVAL_NOT_FOUND' ||
        error.message === 'APPROVAL_NOT_APPROVED' ||
        error.message === 'APPROVAL_EXPIRED'
      ) {
        return NextResponse.json(
          { error: { code: 'INVALID_INPUT', message: 'Med/High intent requires a valid, non-expired approval' } },
          { status: 400 }
        );
      }
    }
    return handleError(error);
  }
}

/**
 * GET /api/agent-runs — List runs (002)
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const limit = parseInt(request.nextUrl.searchParams.get('limit') ?? '50', 10) || 50;
    const runs = await listAgentRuns({ limit });
    return NextResponse.json({ runs });
  } catch (error) {
    return handleError(error);
  }
}
