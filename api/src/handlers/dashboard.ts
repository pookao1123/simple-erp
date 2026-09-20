import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate, scope, type AuthContext } from '../lib/auth';
import { errors, sendJson } from '../lib/error-handler';
import { byMonthSchema } from '../lib/schemas';
import { getAdminClient } from '../lib/supabase-admin';
import { assertMethod, fetchAll, getSegments, parseQuery, round2, throwDb } from '../lib/utils';

/** First day of the month `offset` months from now, as a UTC Date. */
function monthStart(offset = 0): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1));
}
const sum = (rows: { total: number | null }[]) => round2(rows.reduce((s, r) => s + Number(r.total ?? 0), 0));

async function countOf(table: string, auth: AuthContext, filter: (q: any) => any = (q) => q) {
  const { count, error } = await filter(
    scope(getAdminClient().from(table).select('id', { count: 'exact', head: true }), auth),
  );
  if (error) throwDb(error);
  return (count as number | null) ?? 0;
}

async function kpis(res: VercelResponse, auth: AuthContext) {
  const db = getAdminClient();
  const thisMonth = monthStart(0);
  const nextMonth = monthStart(1);

  const [paidRows, allInvoices, sentCount, paidCount, overdueRows, invoiceCustomers, productCount] = await Promise.all([
    // Cash basis: revenue is recognised in the month it was paid.
    fetchAll<{ total: number | null }>((from, to) =>
      scope(db.from('invoices').select('total').eq('status', 'paid'), auth)
        .gte('paid_at', thisMonth.toISOString())
        .lt('paid_at', nextMonth.toISOString())
        .range(from, to),
    ),
    // All-time revenue: sum of all paid invoices.
    fetchAll<{ total: number | null }>((from, to) =>
      scope(db.from('invoices').select('total').eq('status', 'paid'), auth).range(from, to),
    ),
    countOf('invoices', auth, (q) => q.eq('status', 'sent')),
    countOf('invoices', auth, (q) => q.eq('status', 'paid')),
    fetchAll<{ total: number | null }>((from, to) =>
      scope(db.from('invoices').select('total').eq('status', 'overdue'), auth).range(from, to),
    ),
    fetchAll<{ customer_id: string }>((from, to) =>
      scope(db.from('invoices').select('customer_id'), auth).order('id').range(from, to),
    ),
    countOf('products', auth, (q) => q.eq('active', true)),
  ]);

  sendJson(res, 200, {
    revenue: sum(allInvoices),
    revenue_this_month: sum(paidRows),
    invoices_count: allInvoices.length, // total invoices (any status) — approximate via fetched rows
    invoices_sent: sentCount,
    invoices_paid: paidCount,
    invoices_overdue: overdueRows.length,
    customers_count: new Set(invoiceCustomers.map((r) => r.customer_id)).size,
    products_count: productCount,
    overdue_amount: sum(overdueRows),
  });
}

async function invoicesByMonth(res: VercelResponse, url: URL, auth: AuthContext) {
  const { months } = parseQuery(url, byMonthSchema);
  const first = monthStart(-(months - 1));

  const rows = await fetchAll<{ total: number | null; paid_at: string }>((from, to) =>
    scope(getAdminClient().from('invoices').select('total, paid_at').eq('status', 'paid'), auth)
      .gte('paid_at', first.toISOString())
      .order('id')
      .range(from, to),
  );

  const buckets = new Map<string, { invoice_count: number; total: number }>();
  for (let i = 0; i < months; i++) buckets.set(monthStart(-i).toISOString().slice(0, 7), { invoice_count: 0, total: 0 });
  for (const r of rows) {
    const bucket = buckets.get(r.paid_at.slice(0, 7));
    if (!bucket) continue;
    bucket.invoice_count += 1;
    bucket.total += Number(r.total ?? 0);
  }
  // Newest month first, empty months included. Cash basis: paid_amount equals total_amount by definition.
  const data = [...buckets].map(([month, b]) => ({
    month,
    invoice_count: b.invoice_count,
    total_amount: round2(b.total),
    paid_amount: round2(b.total),
  }));
  sendJson(res, 200, { data });
}

async function revenueByCustomer(res: VercelResponse, auth: AuthContext) {
  const rows = await fetchAll<{ customer_id: string; total: number | null }>((from, to) =>
    scope(getAdminClient().from('invoices').select('customer_id, total').eq('status', 'paid'), auth)
      .order('id')
      .range(from, to),
  );
  const byCustomer = new Map<string, number>();
  for (const r of rows) {
    const prev = byCustomer.get(r.customer_id) ?? 0;
    byCustomer.set(r.customer_id, prev + Number(r.total ?? 0));
  }
  const data = [...byCustomer.entries()]
    .map(([customer_id, total_amount]) => ({ customer_id, total_amount: round2(total_amount) }))
    .sort((a, b) => b.total_amount - a.total_amount);
  sendJson(res, 200, { data });
}

export async function handleDashboard(req: VercelRequest, res: VercelResponse, url: URL) {
  const [, action, ...extra] = getSegments(url);
  if (extra.length) throw errors.notFound('Endpoint');
  const auth = await authenticate(req);
  assertMethod(req, ['GET']);
  switch (action) {
    case 'kpis':
      return kpis(res, auth);
    case 'invoices-by-month':
      return invoicesByMonth(res, url, auth);
    case 'revenue-by-customer':
      return revenueByCustomer(res, auth);
    default:
      throw errors.notFound('Endpoint');
  }
}
