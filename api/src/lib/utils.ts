import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { PostgrestError } from '@supabase/supabase-js';
import { z } from 'zod';
import { errors, sendJson } from './error-handler';

/** Path segments after /api/v1, e.g. ['invoices', '<id>', 'send']. */
export function getSegments(url: URL): string[] {
  return url.pathname.replace(/^\/api\/v1\/?/, '').split('/').filter(Boolean);
}

export function parseBody<T extends z.ZodTypeAny>(req: VercelRequest, schema: T): z.output<T> {
  let raw: unknown = req.body;
  if (typeof raw === 'string') {
    try {
      raw = raw.length ? JSON.parse(raw) : {};
    } catch {
      throw errors.invalidInput({}, 'Malformed JSON body');
    }
  }
  const result = schema.safeParse(raw ?? {});
  if (!result.success) throw errors.invalidInput(result.error.flatten());
  return result.data;
}

export function parseQuery<T extends z.ZodTypeAny>(url: URL, schema: T): z.output<T> {
  const result = schema.safeParse(Object.fromEntries(url.searchParams));
  if (!result.success) throw errors.invalidInput(result.error.flatten());
  return result.data;
}

export function assertUuid(value: string, what = 'Resource'): string {
  if (!z.string().uuid().safeParse(value).success) throw errors.notFound(what);
  return value;
}

/** Strip characters that would break PostgREST or() filter syntax / LIKE wildcards. */
export function sanitizeSearch(s: string): string {
  return s.replace(/[,()%*\\]/g, ' ').trim();
}

export function pageRange(page: number, limit: number): [number, number] {
  const from = (page - 1) * limit;
  return [from, from + limit - 1];
}

export function sendPage(
  res: VercelResponse,
  data: unknown[] | null,
  total: number | null,
  page: number,
  limit: number,
): void {
  sendJson(res, 200, { data: data ?? [], total: total ?? 0, page, limit });
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Map a Supabase error to an ApiError; unique violations become 409. */
export function throwDb(error: PostgrestError, conflictMessage = 'Resource conflict'): never {
  if (error.code === '23505') throw errors.conflict(conflictMessage);
  if (error.code === '23503') throw errors.invalidInput({}, 'Referenced resource does not exist');
  console.error('DB error:', error);
  throw errors.internal();
}

/** Page through a query 1000 rows at a time (PostgREST caps responses). */
export async function fetchAll<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: PostgrestError | null }>,
): Promise<T[]> {
  const size = 1000;
  const out: T[] = [];
  for (let from = 0; ; from += size) {
    const { data, error } = await page(from, from + size - 1);
    if (error) throwDb(error);
    out.push(...(data ?? []));
    if (!data || data.length < size) return out;
  }
}

export function assertMethod(req: VercelRequest, allowed: string[]): void {
  if (!allowed.includes(req.method ?? '')) throw errors.notAllowed(req.method ?? 'UNKNOWN');
}
