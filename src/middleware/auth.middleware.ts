import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/src/auth/auth-options';

/**
 * Auth middleware for API routes
 * Asserts that the request has a valid session and returns userId
 */
export async function requireAuth(request: NextRequest): Promise<{ userId: string } | NextResponse> {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
      { status: 401 }
    );
  }

  return { userId: session.user.id as string };
}

/**
 * Get user ID from session (returns null if not authenticated)
 * Use this for optional authentication scenarios
 */
export async function getUserId(request: NextRequest): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return (session?.user?.id as string) || null;
}
