import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate, scope, type AuthContext } from '../lib/auth';
import { errors, sendJson } from '../lib/error-handler';
import { productCreateSchema, productListSchema, productUpdateSchema } from '../lib/schemas';
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

async function list(res: VercelResponse, url: URL, auth: AuthContext) {
  const { page, limit, search, q, active, category } = parseQuery(url, productListSchema);
  const term = sanitizeSearch(search ?? q ?? '');
  let query = scope(getAdminClient().from('products').select('*', { count: 'exact' }), auth);
  // Active products only unless the caller explicitly asks otherwise.
  query = query.eq('active', active ?? true);
  if (term) query = query.ilike('name', `%${term}%`);
  if (category) query = query.eq('category', category);
  const [from, to] = pageRange(page, limit);
  const { data, count, error } = await query.order('name', { ascending: true }).range(from, to);
  if (error) throwDb(error);
  sendPage(res, data, count, page, limit);
}

// Inactive products are still readable so historical references resolve.
async function getOne(id: string, auth: AuthContext) {
  const { data, error } = await scope(
    getAdminClient().from('products').select('*').eq('id', id),
    auth,
  ).maybeSingle();
  if (error) throwDb(error);
  if (!data) throw errors.notFound('Product');
  return data;
}

async function create(req: VercelRequest, res: VercelResponse, auth: AuthContext) {
  const body = parseBody(req, productCreateSchema);
  const { data, error } = await getAdminClient()
    .from('products')
    .insert({ ...body, user_id: auth.userId })
    .select()
    .single();
  if (error) throwDb(error);
  sendJson(res, 201, data);
}

async function update(req: VercelRequest, res: VercelResponse, id: string, auth: AuthContext) {
  const body = parseBody(req, productUpdateSchema);
  if (!Object.keys(body).length) throw errors.invalidInput({}, 'No fields to update');
  await getOne(id, auth);
  const { data, error } = await scope(getAdminClient().from('products').update(body).eq('id', id), auth)
    .select()
    .single();
  if (error) throwDb(error);
  sendJson(res, 200, data);
}

async function remove(res: VercelResponse, id: string, auth: AuthContext) {
  await getOne(id, auth);
  const db = getAdminClient();
  const { error } = await scope(db.from('products').update({ active: false }).eq('id', id), auth);
  if (error) throwDb(error);
  // Per spec: line items keep description/unit_price but lose the product reference.
  const { error: detachErr } = await db.from('line_items').update({ product_id: null }).eq('product_id', id);
  if (detachErr) throwDb(detachErr);
  sendJson(res, 200, { message: 'Product deactivated', id });
}

export async function handleProducts(req: VercelRequest, res: VercelResponse, url: URL) {
  const [, rawId, ...extra] = getSegments(url);
  if (extra.length) throw errors.notFound('Endpoint');
  const auth = await authenticate(req);

  if (rawId === undefined) {
    assertMethod(req, ['GET', 'POST']);
    return req.method === 'GET' ? list(res, url, auth) : create(req, res, auth);
  }
  const id = assertUuid(rawId, 'Product');
  assertMethod(req, ['GET', 'PUT', 'DELETE']);
  if (req.method === 'GET') return sendJson(res, 200, await getOne(id, auth));
  if (req.method === 'PUT') return update(req, res, id, auth);
  return remove(res, id, auth);
}
