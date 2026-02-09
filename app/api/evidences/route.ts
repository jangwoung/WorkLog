import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/src/middleware/auth.middleware';
import { handleError } from '@/src/middleware/error.middleware';
import { createEvidence } from '@/src/services/evidence/evidence.service';

function parseBody(body: unknown): { linkedType: string; linkedId: string; kind: string; url?: string; hash?: string } | null {
  if (!body || typeof body !== 'object') return null;
  const o = body as Record<string, unknown>;
  const linkedType = o.linkedType;
  const linkedId = o.linkedId;
  const kind = o.kind;
  if (typeof linkedType !== 'string' || linkedType.trim() === '') return null;
  if (typeof linkedId !== 'string' || linkedId.trim() === '') return null;
  if (typeof kind !== 'string' || kind.trim() === '') return null;
  const url = typeof o.url === 'string' ? o.url : undefined;
  const hash = typeof o.hash === 'string' ? o.hash : undefined;
  return {
    linkedType: linkedType.trim(),
    linkedId: linkedId.trim(),
    kind: kind.trim(),
    ...(url !== undefined && { url }),
    ...(hash !== undefined && { hash }),
  };
}

/**
 * POST /api/evidences — Attach Evidence to run/intent (002 AI Review MVP)
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json().catch(() => null);
    const input = parseBody(body);
    if (!input) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: 'linkedType, linkedId, kind required; url, hash optional' } },
        { status: 400 }
      );
    }

    const result = await createEvidence(input);
    return NextResponse.json(
      { evidenceId: result.evidenceId, linkedId: result.linkedId, createdAt: result.createdAt.toISOString() },
      { status: 201 }
    );
  } catch (error) {
    return handleError(error);
  }
}
