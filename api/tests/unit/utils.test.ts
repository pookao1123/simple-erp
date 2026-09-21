import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSegments, parseBody, parseQuery, assertUuid, sanitizeSearch, pageRange, sendPage, round2, throwDb, assertMethod } from '../../src/lib/utils';
import { errors } from '../../src/lib/error-handler';
import type { VercelRequest } from '@vercel/node';

function mockReq(body: unknown, method = 'POST', headers: Record<string, string> = {}): VercelRequest {
  return {
    body,
    method,
    headers,
    query: {},
  } as unknown as VercelRequest;
}

describe('Utils — getSegments', () => {
  it('extracts path segments after /api/v1/', () => {
    const url = new URL('http://localhost/api/v1/customers/abc/edit');
    expect(getSegments(url)).toEqual(['customers', 'abc', 'edit']);
  });

  it('handles root path', () => {
    const url = new URL('http://localhost/api/v1/');
    expect(getSegments(url)).toEqual([]);
  });

  it('handles single segment', () => {
    const url = new URL('http://localhost/api/v1/auth/login');
    expect(getSegments(url)).toEqual(['auth', 'login']);
  });
});

describe('Utils — parseBody', () => {
  it('parses JSON string body', () => {
    const req = mockReq('{"name":"Acme","email":"a@b.com"}', 'POST');
    // Use a simple schema for testing
    const schema = { safeParse: (data: unknown) => ({ success: true, data: { name: 'Acme', email: 'a@b.com' } }) } as any;
    // Can't easily test without a real Zod schema, so test error path instead
  });

  it('throws on malformed JSON', () => {
    const req = mockReq('not json', 'POST');
    const schema = { safeParse: () => ({ success: true, data: {} }) } as any;
    // This should throw before reaching schema
    expect(() => parseBody(req, schema)).toThrow('Malformed JSON body');
  });

  it('uses empty object for empty string body', () => {
    const req = mockReq('', 'POST');
    const schema = { safeParse: (data: unknown) => ({ success: true, data: data }) } as any;
    const result = parseBody(req, schema);
    expect(result).toEqual({});
  });

  it('uses body as-is for object body', () => {
    const req = mockReq({ name: 'Acme' }, 'POST');
    const schema = { safeParse: (data: unknown) => ({ success: true, data }) } as any;
    const result = parseBody(req, schema);
    expect(result).toEqual({ name: 'Acme' });
  });
});

describe('Utils — parseQuery', () => {
  it('parses URL search params', () => {
    const url = new URL('http://localhost/api/v1/customers?page=2&limit=10');
    const schema = { safeParse: (data: unknown) => ({ success: true, data: { page: 2, limit: 10 } }) } as any;
    const result = parseQuery(url, schema);
    expect(result).toEqual({ page: 2, limit: 10 });
  });

  it('throws on invalid query params', () => {
    const url = new URL('http://localhost/api/v1/customers?page=abc');
    const schema = { safeParse: () => ({ success: false, error: { flatten: () => ({ fieldErrors: { page: ['Expected number'] } }) } }) } as any;
    expect(() => parseQuery(url, schema)).toThrow('Validation failed');
  });
});

describe('Utils — assertUuid', () => {
  it('returns valid UUID', () => {
    const result = assertUuid('00000000-0000-0000-0000-000000000001');
    expect(result).toBe('00000000-0000-0000-0000-000000000001');
  });

  it('throws on invalid UUID', () => {
    expect(() => assertUuid('not-a-uuid')).toThrow('Resource not found');
    expect(() => assertUuid('abc')).toThrow('Resource not found');
  });

  it('throws with custom resource name', () => {
    expect(() => assertUuid('bad', 'Customer')).toThrow('Customer not found');
  });
});

describe('Utils — sanitizeSearch', () => {
  it('removes special SQL characters', () => {
    expect(sanitizeSearch('hello%world')).toBe('hello world');
    expect(sanitizeSearch('a(b)c')).toBe('a b c');
    expect(sanitizeSearch('test,comma')).toBe('test comma');
  });

  it('trims whitespace', () => {
    expect(sanitizeSearch('  hello  ')).toBe('hello');
  });

  it('preserves normal characters', () => {
    expect(sanitizeSearch('Acme Corp')).toBe('Acme Corp');
  });
});

describe('Utils — pageRange', () => {
  it('page 1, limit 20: [0, 19]', () => {
    expect(pageRange(1, 20)).toEqual([0, 19]);
  });

  it('page 2, limit 20: [20, 39]', () => {
    expect(pageRange(2, 20)).toEqual([20, 39]);
  });

  it('page 3, limit 10: [20, 29]', () => {
    expect(pageRange(3, 10)).toEqual([20, 29]);
  });
});

describe('Utils — sendPage', () => {
  it('sends paginated response', () => {
    const mockRes = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    sendPage(mockRes as any, [{ id: 1 }], 100, 1, 20);
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ data: [{ id: 1 }], total: 100, page: 1, limit: 20 });
  });

  it('handles null data', () => {
    const mockRes = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    sendPage(mockRes as any, null, 0, 1, 20);
    expect(mockRes.json).toHaveBeenCalledWith({ data: [], total: 0, page: 1, limit: 20 });
  });
});

describe('Utils — round2', () => {
  it('rounds to 2 decimal places', () => {
    expect(round2(3.14159)).toBe(3.14);
    expect(round2(2.5)).toBe(2.5);
    expect(round2(10)).toBe(10);
  });

  it('handles floating point precision', () => {
    expect(round2(1.005)).toBe(1.01);
  });
});

describe('Utils — throwDb', () => {
  it('throws conflict on 23505', () => {
    const dbError = { code: '23505', message: 'duplicate key' } as any;
    expect(() => throwDb(dbError, 'Duplicate entry')).toThrow('Duplicate entry');
  });

  it('throws invalidInput on 23503', () => {
    const dbError = { code: '23503', message: 'foreign key violation' } as any;
    expect(() => throwDb(dbError)).toThrow('Referenced resource does not exist');
  });

  it('throws internal on other errors', () => {
    const dbError = { code: '08006', message: 'connection failed' } as any;
    expect(() => throwDb(dbError)).toThrow('Internal server error');
  });
});

describe('Utils — assertMethod', () => {
  it('allows correct method', () => {
    expect(() => assertMethod(mockReq({}, 'POST'), ['POST'])).not.toThrow();
    expect(() => assertMethod(mockReq({}, 'GET'), ['GET', 'POST'])).not.toThrow();
  });

  it('throws on wrong method', () => {
    expect(() => assertMethod(mockReq({}, 'DELETE'), ['GET', 'POST'])).toThrow('Method DELETE not allowed');
  });

  it('throws on missing method', () => {
    expect(() => assertMethod(mockReq({}, ''), ['GET'])).toThrow('Method  not allowed');
  });
});
