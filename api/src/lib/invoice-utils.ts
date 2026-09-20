import { getAdminClient } from './supabase-admin';
import { round2, throwDb } from './utils';
import { errors } from './error-handler';
import { scope, type AuthContext } from './auth';

export const INVOICE_LIST_SELECT = '*, customer:customers(id,name,email)';
export const INVOICE_FULL_SELECT =
  '*, customer:customers(id,name,email), line_items(*, product:products(id,name))';

interface LineForTotals {
  qty: number;
  unit_price: number;
  tax_rate: number | null;
}

export function calcTotals(items: LineForTotals[]) {
  let subtotal = 0;
  let tax = 0;
  for (const i of items) {
    const line = Number(i.qty) * Number(i.unit_price);
    subtotal += line;
    tax += (line * Number(i.tax_rate ?? 0)) / 100;
  }
  return { subtotal: round2(subtotal), tax: round2(tax), total: round2(subtotal + tax) };
}

/** Recompute subtotal/tax/total from the invoice's line items and persist. */
export async function recalcInvoice(invoiceId: string): Promise<void> {
  const db = getAdminClient();
  const { data, error } = await db
    .from('line_items')
    .select('qty, unit_price, tax_rate')
    .eq('invoice_id', invoiceId);
  if (error) throwDb(error);
  const { error: upErr } = await db.from('invoices').update(calcTotals(data ?? [])).eq('id', invoiceId);
  if (upErr) throwDb(upErr);
}

/** Next INV-YYYY-NNNN for this user: highest existing sequence in that year + 1 (safe after draft deletes). */
export async function nextInvoiceNo(userId: string, year: string): Promise<string> {
  const { data, error } = await getAdminClient()
    .from('invoices')
    .select('invoice_no')
    .eq('user_id', userId)
    .like('invoice_no', `INV-${year}-%`)
    .order('invoice_no', { ascending: false })
    .limit(1);
  if (error) throwDb(error);
  const last = data?.[0]?.invoice_no as string | undefined;
  const seq = last ? parseInt(last.split('-')[2], 10) || 0 : 0;
  return `INV-${year}-${String(seq + 1).padStart(4, '0')}`;
}

/** Load an invoice visible to the caller, or 404. */
export async function loadInvoice(id: string, auth: AuthContext, select = '*') {
  const { data, error } = await scope(
    getAdminClient().from('invoices').select(select).eq('id', id),
    auth,
  ).maybeSingle();
  if (error) throwDb(error);
  if (!data) throw errors.notFound('Invoice');
  return data as any;
}

export function assertDraft(invoice: { status: string }): void {
  if (invoice.status !== 'draft') {
    throw errors.invalidState(`Invoice is ${invoice.status}; only draft invoices can be modified`);
  }
}

/** Customer must exist and belong to caller (admin: any). 400 on failure since it is a referenced id. */
export async function assertCustomerAccess(customerId: string, auth: AuthContext): Promise<void> {
  const { data, error } = await scope(
    getAdminClient().from('customers').select('id').eq('id', customerId),
    auth,
  ).maybeSingle();
  if (error) throwDb(error);
  if (!data) throw errors.invalidInput({}, 'customer_id does not exist or is not yours');
}

export async function assertProductsAccess(
  productIds: string[],
  auth: AuthContext,
): Promise<Map<string, any>> {
  const unique = [...new Set(productIds)];
  if (!unique.length) return new Map();
  const { data, error } = await scope(
    getAdminClient().from('products').select('id, name, price').in('id', unique),
    auth,
  );
  if (error) throwDb(error);
  const found = new Map<string, any>((data ?? []).map((p: any) => [p.id, p]));
  if (found.size !== unique.length) {
    throw errors.invalidInput({}, 'product_id does not exist or is not yours');
  }
  return found;
}
