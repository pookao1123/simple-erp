import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate, scope, type AuthContext } from '../lib/auth';
import { errors, sendJson } from '../lib/error-handler';
import {
  INVOICE_FULL_SELECT,
  INVOICE_LIST_SELECT,
  assertCustomerAccess,
  assertDraft,
  assertProductsAccess,
  loadInvoice,
  nextInvoiceNo,
  recalcInvoice,
} from '../lib/invoice-utils';
import {
  invoiceCreateSchema,
  invoiceListSchema,
  invoiceUpdateSchema,
  markPaidSchema,
  sendInvoiceSchema,
} from '../lib/schemas';
import { getAdminClient } from '../lib/supabase-admin';
import { handleLineItems } from './line-items';
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

const MAX_NUMBER_ATTEMPTS = 3;

async function loadFull(id: string, auth: AuthContext) {
  const { data, error } = await scope(
    getAdminClient()
      .from('invoices')
      .select(INVOICE_FULL_SELECT)
      .eq('id', id)
      .order('created_at', { referencedTable: 'line_items', ascending: true }),
    auth,
  ).maybeSingle();
  if (error) throwDb(error);
  if (!data) throw errors.notFound('Invoice');
  return data;
}

async function list(res: VercelResponse, url: URL, auth: AuthContext) {
  const params = parseQuery(url, invoiceListSchema);
  const { page, limit, status, customer_id } = params;
  const dateFrom = params.date_from ?? params.from;
  const dateTo = params.date_to ?? params.to;
  const term = sanitizeSearch(params.search ?? params.q ?? '');
  const db = getAdminClient();

  let query = scope(db.from('invoices').select(INVOICE_LIST_SELECT, { count: 'exact' }), auth);
  if (status) query = query.eq('status', status);
  if (customer_id) query = query.eq('customer_id', customer_id);
  if (dateFrom) query = query.gte('date', dateFrom);
  if (dateTo) query = query.lte('date', dateTo);
  if (term) {
    const { data: matches, error } = await scope(
      db.from('customers').select('id').ilike('name', `%${term}%`).limit(200),
      auth,
    );
    if (error) throwDb(error);
    const ids = (matches ?? []).map((c: { id: string }) => c.id);
    query = query.or(
      ids.length ? `invoice_no.ilike.%${term}%,customer_id.in.(${ids.join(',')})` : `invoice_no.ilike.%${term}%`,
    );
  }
  const [from, to] = pageRange(page, limit);
  const { data, count, error } = await query.order('created_at', { ascending: false }).range(from, to);
  if (error) throwDb(error);
  sendPage(res, data, count, page, limit);
}

async function create(req: VercelRequest, res: VercelResponse, auth: AuthContext) {
  const body = parseBody(req, invoiceCreateSchema);
  const lines = body.line_items ?? [];
  await assertCustomerAccess(body.customer_id, auth);
  await assertProductsAccess(
    lines.flatMap((l) => (l.product_id ? [l.product_id] : [])),
    auth,
  );

  const db = getAdminClient();
  const year = body.date.slice(0, 4);
  let invoiceId: string | undefined;
  for (let attempt = 1; !invoiceId; attempt++) {
    const { data, error } = await db
      .from('invoices')
      .insert({
        user_id: auth.userId,
        customer_id: body.customer_id,
        invoice_no: await nextInvoiceNo(auth.userId, year),
        date: body.date,
        due_date: body.due_date,
        notes: body.notes,
        status: 'draft',
      })
      .select('id')
      .single();
    if (!error) invoiceId = data.id;
    else if (error.code === '23505' && attempt < MAX_NUMBER_ATTEMPTS) continue; // concurrent create took our number
    else throwDb(error, 'Could not allocate invoice number, please retry');
  }

  try {
    if (lines.length) {
      const { error } = await db
        .from('line_items')
        .insert(lines.map((l) => ({ ...l, invoice_id: invoiceId, tax_rate: l.tax_rate ?? 0 })));
      if (error) throwDb(error);
    }
    await recalcInvoice(invoiceId);
  } catch (err) {
    await db.from('invoices').delete().eq('id', invoiceId); // no partial invoices
    throw err;
  }
  sendJson(res, 201, await loadFull(invoiceId, auth));
}

async function update(req: VercelRequest, res: VercelResponse, id: string, auth: AuthContext) {
  const invoice = await loadInvoice(id, auth);
  assertDraft(invoice);
  const body = parseBody(req, invoiceUpdateSchema);
  const db = getAdminClient();

  if (body.customer_id) await assertCustomerAccess(body.customer_id, auth);
  const date = body.date ?? invoice.date;
  const dueDate = body.due_date ?? invoice.due_date;
  if (dueDate < date) throw errors.invalidInput({}, 'due_date must be on or after date');

  const lineUpdates = body.line_items ?? [];
  if (lineUpdates.length) {
    const ids = lineUpdates.map((l) => l.line_id);
    const { data, error } = await db.from('line_items').select('id').eq('invoice_id', id).in('id', ids);
    if (error) throwDb(error);
    if (new Set(data?.map((r) => r.id)).size !== new Set(ids).size) {
      throw errors.invalidInput({}, 'line_id does not belong to this invoice');
    }
  }

  const fields = {
    customer_id: body.customer_id,
    date: body.date,
    due_date: body.due_date,
    notes: body.notes,
  };
  const changed = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined));
  if (Object.keys(changed).length) {
    const { error } = await db.from('invoices').update(changed).eq('id', id);
    if (error) throwDb(error);
  }
  for (const { line_id, ...patch } of lineUpdates) {
    if (!Object.keys(patch).length) continue;
    const { error } = await db.from('line_items').update(patch).eq('id', line_id).eq('invoice_id', id);
    if (error) throwDb(error);
  }
  await recalcInvoice(id);
  sendJson(res, 200, await loadFull(id, auth));
}

async function remove(res: VercelResponse, id: string, auth: AuthContext) {
  const invoice = await loadInvoice(id, auth);
  assertDraft(invoice);
  const { error } = await getAdminClient().from('invoices').delete().eq('id', id).eq('status', 'draft');
  if (error) throwDb(error);
  sendJson(res, 200, { message: 'Invoice deleted', id });
}

async function send(req: VercelRequest, res: VercelResponse, id: string, auth: AuthContext) {
  parseBody(req, sendInvoiceSchema); // send_email accepted but email delivery is not implemented in MVP
  const invoice = await loadInvoice(id, auth);
  if (invoice.status !== 'draft') throw errors.invalidState(`Invoice is ${invoice.status}; only draft invoices can be sent`);
  const { data, error } = await getAdminClient()
    .from('invoices')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'draft')
    .select('id, invoice_no, status, sent_at')
    .maybeSingle();
  if (error) throwDb(error);
  if (!data) throw errors.invalidState('Invoice status changed concurrently');
  sendJson(res, 200, data);
}

async function markPaid(req: VercelRequest, res: VercelResponse, id: string, auth: AuthContext) {
  const { payment_date } = parseBody(req, markPaidSchema);
  const invoice = await loadInvoice(id, auth);
  if (invoice.status !== 'sent' && invoice.status !== 'overdue') {
    throw errors.invalidState(`Invoice is ${invoice.status}; only sent or overdue invoices can be marked paid`);
  }
  const { data, error } = await getAdminClient()
    .from('invoices')
    .update({
      status: 'paid',
      paid_at: payment_date ? `${payment_date}T00:00:00Z` : new Date().toISOString(),
    })
    .eq('id', id)
    .in('status', ['sent', 'overdue'])
    .select('id, invoice_no, status, paid_at, total')
    .maybeSingle();
  if (error) throwDb(error);
  if (!data) throw errors.invalidState('Invoice status changed concurrently');
  sendJson(res, 200, data);
}

export async function handleInvoices(req: VercelRequest, res: VercelResponse, url: URL) {
  const [, rawId, action, ...extra] = getSegments(url);
  if (extra.length) throw errors.notFound('Endpoint');
  const auth = await authenticate(req);

  if (rawId === undefined) {
    assertMethod(req, ['GET', 'POST']);
    return req.method === 'GET' ? list(res, url, auth) : create(req, res, auth);
  }
  const id = assertUuid(rawId, 'Invoice');

  if (action === undefined) {
    assertMethod(req, ['GET', 'PUT', 'DELETE']);
    if (req.method === 'GET') return sendJson(res, 200, await loadFull(id, auth));
    if (req.method === 'PUT') return update(req, res, id, auth);
    return remove(res, id, auth);
  }
  switch (action) {
    case 'send':
      assertMethod(req, ['POST']);
      return send(req, res, id, auth);
    case 'mark-paid':
      assertMethod(req, ['POST']);
      return markPaid(req, res, id, auth);
    case 'line-items':
      return handleLineItems(req, res, url, auth);
    default:
      throw errors.notFound('Endpoint');
  }
}
