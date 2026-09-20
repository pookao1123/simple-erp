import type { VercelResponse } from '@vercel/node';

export type ErrorCode =
  | 'INVALID_INPUT'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'NOT_ALLOWED'
  | 'CONFLICT'
  | 'INVALID_STATE'
  | 'IN_USE'
  | 'UNPROCESSABLE_ENTITY'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

const STATUS: Record<ErrorCode, number> = {
  INVALID_INPUT: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  NOT_ALLOWED: 405,
  CONFLICT: 409,
  INVALID_STATE: 409,
  IN_USE: 409,
  UNPROCESSABLE_ENTITY: 422,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
};

export class ApiError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly details: unknown = {},
  ) {
    super(message);
  }

  get status(): number {
    return STATUS[this.code];
  }
}

export const errors = {
  invalidInput: (details: unknown = {}, message = 'Validation failed') =>
    new ApiError('INVALID_INPUT', message, details),
  unauthorized: (message = 'Missing or invalid token') => new ApiError('UNAUTHORIZED', message),
  forbidden: (message = 'Insufficient permissions') => new ApiError('FORBIDDEN', message),
  notFound: (what = 'Resource') => new ApiError('NOT_FOUND', `${what} not found`),
  notAllowed: (method: string) => new ApiError('NOT_ALLOWED', `Method ${method} not allowed`),
  conflict: (message: string) => new ApiError('CONFLICT', message),
  invalidState: (message: string) => new ApiError('INVALID_STATE', message),
  inUse: (message: string) => new ApiError('IN_USE', message),
  internal: (message = 'Internal server error') => new ApiError('INTERNAL_ERROR', message),
};

export function sendJson(res: VercelResponse, status: number, body: unknown): void {
  res.status(status).json(body);
}

export function sendError(res: VercelResponse, err: unknown): void {
  if (err instanceof ApiError) {
    sendJson(res, err.status, {
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }
  console.error('Unhandled error:', err);
  sendJson(res, 500, {
    error: { code: 'INTERNAL_ERROR', message: 'Internal server error', details: {} },
  });
}
