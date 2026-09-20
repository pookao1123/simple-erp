import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { AuthContext } from '../lib/auth';
import { errors, sendJson } from '../lib/error-handler';
import { assertDraft, assertProductsAccess, loadInvoice, recalcInvoice } from '../lib/invoice-utils';
import { lineItemCreateSchema, lineItemUpdateSchema } from '../lib/schemas';
import { getAdminClient } from '../lib/supabase-admin';
import { assertMethod, assertUuid, getSegments, parseBody, throwDb } from '../lib/utils';

const LINE_SELECT = '*, product:products(id,name)';

/** Load a line item plus its parent invoice; 404 unless the caller may see that invoice. */
async function loadLine(invoiceId: string, lineId: string, auth: AuthContext) {
  const { data, error } = await getAdminClient()
    .from('line_items')
    .select('*, invoice:invoices(id, user_id, status)')
    .eq('id', lineId)
    .eq('invoice_id', invoiceId)
    .maybeSingle();
  if (error) throwDb(error);
  const invoice = data?.invoice as { id: string; user_id: string; status: string } | null | undefined;
  if (!data || !invoice || (!auth.isAdmin && invoice.user_id !== auth.userId)) {
    throw errors.notFound('Line item');
  }
  return { line: data, invoice };
}

async function create(req: VercelRequest, res: VercelResponse, invoiceId: string, auth: AuthContext) {
  const body = parseBody(req, lineItemCreateSchema);
  const invoice = await loadInvoice(invoiceId, auth);
  assertDraft(invoice);

  let description = body.description;
  if (body.product_id) {
    const products = await assertProductsAccess([body.product_id], auth);
    description ??= products.get(body.product_id).name;
  }
  if (!description) {
    throw errors.invalidInput({ fieldErrors: { description: ['Required when product_id is not given'] } }, 'Description is required when product_id is not given');
  }

  const { data, error } = await getAdminClient()
    .from('line_items')
    .insert({
      invoice_id: invoiceId,
      product_id: body.product_id ?? null,
      description,
      qty: body.qty,
      unit_price: body.unit_price,
      tax_rate: body.tax_rate ?? 0,
    })
    .select(LINE_SELECT)
    .single();
  if (error) throwDb(error);
  await recalcInvoice(invoiceId);
  sendJson(res, 201, data);
}

async function update(req: VercelRequest, res: VercelResponse, invoiceId: string, lineId: string, auth: AuthContext) {
  const body = parseBody(req, lineItemUpdateSchema);
  if (!Object.keys(body).length) throw errors.invalidInput({}, 'No fields to update');
  const { invoice } = await loadLine(invoiceId, lineId, auth);
  assertDraft(invoice);

  const { data, error } = await getAdminClient()
    .from('line_items')
    .update(body)
    .eq('id', lineId)
    .eq('invoice_id', invoiceId)
    .select(LINE_SELECT)
    .single();
  if (error) throwDb(error);
  await recalcInvoice(invoice.id);
  sendJson(res, 200, data);
}

async function remove(res: VercelResponse, invoiceId: string, lineId: string, auth: AuthContext) {
  const { invoice } = await loadLine(invoiceId, lineId, auth);
  assertDraft(invoice);
  const { error } = await getAdminClient().from('line_items').delete().eq('id', lineId).eq('invoice_id', invoiceId);
  if (error) throwDb(error);
  await recalcInvoice(invoice.id);
  sendJson(res, 200, { message: 'Line item removed', id: lineId });
}

export async function handleLineItems(req: VercelRequest, res: VercelResponse, url: URL, auth: AuthContext) {
  const segs = getSegments(url);
  // Pattern: /api/v1/invoices/:invoice_id/line-items[/:line_id]
  const invoiceIdx = segs.indexOf('line-items');
  if (invoiceIdx < 1) throw errors.notFound('Endpoint');
  const rawInvoiceId = segs[invoiceIdx - 1];
  const invoiceId = assertUuid(rawInvoiceId, 'Invoice');
  const rawLineId = segs[invoiceIdx + 1];

  if (rawLineId === undefined) {
    assertMethod(req, ['POST']);
    return create(req, res, invoiceId, auth);
  }
  const lineId = assertUuid(rawLineId, 'Line item');
  assertMethod(req, ['PUT', 'DELETE']);
  return req.method === 'PUT' ? update(req, res, invoiceId, lineId, auth) : remove(res, invoiceId, lineId, auth);
}
