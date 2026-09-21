import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate } from '../lib/auth';
import { errors, sendJson } from '../lib/error-handler';
import { assertMethod, parseQuery } from '../lib/utils';
import { z } from 'zod';

const pageSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export async function handleAuditLog(req: VercelRequest, res: VercelResponse, url: URL) {
  await authenticate(req);
  const action = url.pathname.split('/').pop()!;

  switch (action) {
    case 'list':
      assertMethod(req, ['GET']);
      return listAuditLog(res, url);
    default:
      throw errors.notAllowed(url.pathname);
  }
}

async function listAuditLog(res: VercelResponse, url: URL) {
  const params = parseQuery(url, pageSchema);
  const { page, limit } = params;
  const from = (page - 1) * limit;

  const db = require('@supabase/supabase-js').createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  let query = db.from('audit_log').select('*');
  const tableFilter = url.searchParams.get('table');
  const recordIdFilter = url.searchParams.get('record_id');
  const startDate = url.searchParams.get('start_date');
  const endDate = url.searchParams.get('end_date');

  if (tableFilter) query = query.eq('table_name', tableFilter);
  if (recordIdFilter) query = query.eq('record_id', recordIdFilter);
  if (startDate) query = query.gte('created_at', startDate + 'T00:00:00Z');
  if (endDate) query = query.lte('created_at', endDate + 'T23:59:59Z');

  const { data, error, count } = await query.range(from, from + limit - 1).select('*', { count: 'exact' });
  if (error) throw errors.internal();

  sendJson(res, 200, { data: data ?? [], total: count ?? 0, page, limit });
}
