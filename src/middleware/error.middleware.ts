import { NextResponse } from 'next/server';

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Centralized error handler for API routes
 * Maps known errors to HTTP status codes and JSON responses
 */
export function handleError(error: unknown): NextResponse {
  // Log error for debugging
  console.error('API Error:', error);

  // Handle known AppError
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          ...(error.details != null ? { details: error.details } : {}),
        },
      },
      { status: error.statusCode }
    );
  }

  // Handle validation errors
  if (error instanceof Error && error.name === 'ValidationError') {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message,
        },
      },
      { status: 400 }
    );
  }

  // Handle unknown errors
  return NextResponse.json(
    {
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    },
    { status: 500 }
  );
}

/**
 * Common error creators
 */
export const Errors = {
  unauthorized: (message = 'Authentication required') =>
    new AppError('UNAUTHORIZED', message, 401),
  forbidden: (message = 'Access denied') =>
    new AppError('FORBIDDEN', message, 403),
  notFound: (message = 'Resource not found') =>
    new AppError('NOT_FOUND', message, 404),
  badRequest: (message = 'Invalid request', details?: unknown) =>
    new AppError('BAD_REQUEST', message, 400, details),
  conflict: (message = 'Resource conflict') =>
    new AppError('CONFLICT', message, 409),
  internal: (message = 'Internal server error', details?: unknown) =>
    new AppError('INTERNAL_SERVER_ERROR', message, 500, details),
};
