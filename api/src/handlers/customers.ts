import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate, scope, type AuthContext } from '../lib/auth';
import { errors, sendJson } from '../lib/error-handler';
import { customerCreateSchema, customerListSchema, customerUpdateSchema } from '../lib/schemas';
import { getAdminClient } from '../lib/supabase-admin';
import {
  assertMethod,
  assertUuid,
  getSegments,
  pageRange,
  parseBody,
  parseQuery,
  sanitizeSearch,
  sendPage,
  throwDb,
} from '../lib/utils';

const EMAIL_CONFLICT = 'A customer with this email already exists';

async function list(res: VercelResponse, url: URL, auth: AuthContext) {
  const { page, limit, search, q, active } = parseQuery(url, customerListSchema);
  const term = sanitizeSearch(search ?? q ?? '');
  let query = scope(getAdminClient().from('customers').select('*', { count: 'exact' }), auth);
  if (term) query = query.or(`name.ilike.%${term}%,email.ilike.%${term}%`);
  if (active !== undefined) query = query.eq('active', active);
  const [from, to] = pageRange(page, limit);
  const { data, count, error } = await query.order('created_at', { ascending: false }).range(from, to);
  if (error) throwDb(error);
  sendPage(res, data, count, page, limit);
}

async function getOne(id: string, auth: AuthContext) {
  const { data, error } = await scope(
    getAdminClient().from('customers').select('*').eq('id', id),
    auth,
  ).maybeSingle();
  if (error) throwDb(error);
  if (!data) throw errors.notFound('Customer');
  return data;
}

async function create(req: VercelRequest, res: VercelResponse, auth: AuthContext) {
  const body = parseBody(req, customerCreateSchema);
  const { data, error } = await getAdminClient()
    .from('customers')
    .insert({ ...body, user_id: auth.userId })
    .select()
    .single();
  if (error) throwDb(error, EMAIL_CONFLICT);
  sendJson(res, 201, data);
}

async function update(req: VercelRequest, res: VercelResponse, id: string, auth: AuthContext) {
  const body = parseBody(req, customerUpdateSchema);
  if (!Object.keys(body).length) throw errors.invalidInput({}, 'No fields to update');
  await getOne(id, auth);
  const { data, error } = await scope(
    getAdminClient().from('customers').update(body).eq('id', id),
    auth,
  )
    .select()
    .single();
  if (error) throwDb(error, EMAIL_CONFLICT);
  sendJson(res, 200, data);
}

async function remove(res: VercelResponse, id: string, auth: AuthContext) {
  await getOne(id, auth);
  const db = getAdminClient();
  const { count, error: countErr } = await db
    .from('invoices')
    .select('id', { count: 'exact', head: true })
    .eq('customer_id', id);
  if (countErr) throwDb(countErr);
  if (count) throw errors.inUse('Customer has existing invoices and cannot be deleted');
  const { error } = await scope(db.from('customers').update({ active: false }).eq('id', id), auth);
  if (error) throwDb(error);
  sendJson(res, 200, { message: 'Customer deactivated', id });
}

export async function handleCustomers(req: VercelRequest, res: VercelResponse, url: URL) {
  const [, rawId, ...extra] = getSegments(url);
  if (extra.length) throw errors.notFound('Endpoint');
  const auth = await authenticate(req);

  if (rawId === undefined) {
    assertMethod(req, ['GET', 'POST']);
    return req.method === 'GET' ? list(res, url, auth) : create(req, res, auth);
  }
  const id = assertUuid(rawId, 'Customer');
  assertMethod(req, ['GET', 'PUT', 'DELETE']);
  if (req.method === 'GET') return sendJson(res, 200, await getOne(id, auth));
  if (req.method === 'PUT') return update(req, res, id, auth);
  return remove(res, id, auth);
}
