import { describe, it, expect } from 'vitest';
import { errors, ApiError, sendError, sendJson } from '../../src/lib/error-handler';

describe('Error Handler — ApiError', () => {
  it('creates error with code and message', () => {
    const err = new ApiError('NOT_FOUND', 'User not found');
    expect(err.code).toBe('NOT_FOUND');
    expect(err.message).toBe('User not found');
    expect(err.status).toBe(404);
  });

  it('default details is empty object', () => {
    const err = new ApiError('INVALID_INPUT', 'Bad input');
    expect(err.details).toEqual({});
  });

  it('custom details', () => {
    const err = new ApiError('INVALID_INPUT', 'Bad input', { field: 'email' });
    expect(err.details).toEqual({ field: 'email' });
  });

  it('status mapping is correct for all codes', () => {
    expect(new ApiError('INVALID_INPUT', 'x').status).toBe(400);
    expect(new ApiError('UNAUTHORIZED', 'x').status).toBe(401);
    expect(new ApiError('FORBIDDEN', 'x').status).toBe(403);
    expect(new ApiError('NOT_FOUND', 'x').status).toBe(404);
    expect(new ApiError('NOT_ALLOWED', 'x').status).toBe(405);
    expect(new ApiError('CONFLICT', 'x').status).toBe(409);
    expect(new ApiError('INVALID_STATE', 'x').status).toBe(409);
    expect(new ApiError('IN_USE', 'x').status).toBe(409);
    expect(new ApiError('UNPROCESSABLE_ENTITY', 'x').status).toBe(422);
    expect(new ApiError('RATE_LIMITED', 'x').status).toBe(429);
    expect(new ApiError('INTERNAL_ERROR', 'x').status).toBe(500);
  });
});

describe('Error Handler — errors factory', () => {
  it('invalidInput: default message', () => {
    const err = errors.invalidInput();
    expect(err.code).toBe('INVALID_INPUT');
    expect(err.message).toBe('Validation failed');
    expect(err.status).toBe(400);
  });

  it('invalidInput: custom details', () => {
    const err = errors.invalidInput({ email: ['Required'] });
    expect(err.details).toEqual({ email: ['Required'] });
  });

  it('invalidInput: custom message', () => {
    const err = errors.invalidInput({}, 'Email is required');
    expect(err.message).toBe('Email is required');
  });

  it('unauthorized: default message', () => {
    const err = errors.unauthorized();
    expect(err.message).toBe('Missing or invalid token');
    expect(err.status).toBe(401);
  });

  it('unauthorized: custom message', () => {
    const err = errors.unauthorized('Invalid token');
    expect(err.message).toBe('Invalid token');
  });

  it('forbidden: default message', () => {
    const err = errors.forbidden();
    expect(err.message).toBe('Insufficient permissions');
    expect(err.status).toBe(403);
  });

  it('notFound: default', () => {
    const err = errors.notFound();
    expect(err.message).toBe('Resource not found');
    expect(err.status).toBe(404);
  });

  it('notFound: custom resource', () => {
    const err = errors.notFound('Customer');
    expect(err.message).toBe('Customer not found');
  });

  it('notAllowed: method in message', () => {
    const err = errors.notAllowed('PUT');
    expect(err.message).toBe('Method PUT not allowed');
    expect(err.status).toBe(405);
  });

  it('conflict: custom message', () => {
    const err = errors.conflict('Email already registered');
    expect(err.message).toBe('Email already registered');
    expect(err.status).toBe(409);
  });

  it('invalidState: custom message', () => {
    const err = errors.invalidState('Invoice is already paid');
    expect(err.message).toBe('Invoice is already paid');
    expect(err.status).toBe(409);
  });

  it('inUse: custom message', () => {
    const err = errors.inUse('Customer has invoices');
    expect(err.message).toBe('Customer has invoices');
    expect(err.status).toBe(409);
  });

  it('internal: default message', () => {
    const err = errors.internal();
    expect(err.message).toBe('Internal server error');
    expect(err.status).toBe(500);
  });

  it('internal: custom message', () => {
    const err = errors.internal('Database connection failed');
    expect(err.message).toBe('Database connection failed');
  });
});

describe('Error Handler — sendError', () => {
  it('serializes ApiError to correct JSON shape', () => {
    const mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const err = new ApiError('NOT_FOUND', 'Customer not found', { id: 'abc' });
    sendError(mockRes as any, err);
    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: { code: 'NOT_FOUND', message: 'Customer not found', details: { id: 'abc' } },
    });
  });

  it('sendError: serializes non-ApiError to 500', () => {
    const mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const err = new Error('Something went wrong');
    sendError(mockRes as any, err);
    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error', details: {} },
    });
  });
});

describe('Error Handler — sendJson', () => {
  it('calls res.status().json()', () => {
    const mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    sendJson(mockRes as any, 200, { user: { id: 'abc' } });
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ user: { id: 'abc' } });
  });
});
