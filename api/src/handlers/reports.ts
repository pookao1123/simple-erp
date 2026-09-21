import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate } from '../lib/auth';
import { errors, sendJson } from '../lib/error-handler';
import { assertMethod, parseQuery } from '../lib/utils';
import { round2 } from '../lib/utils';
import { z } from 'zod';

const reportQuerySchema = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  tax_rate: z.string().optional(),
  group_by: z.enum(['daily', 'weekly', 'monthly']).optional(),
  days_overdue: z.coerce.number().int().optional(),
});

export async function handleReports(_req: VercelRequest, res: VercelResponse, url: URL) {
  await authenticate(_req);
  const action = url.pathname.split('/').pop()!;

  switch (action) {
    case 'tax-summary':
      assertMethod(_req, ['GET']);
      return taxSummary(res, url);
    case 'revenue':
      assertMethod(_req, ['GET']);
      return revenueReport(res, url);
    case 'outstanding':
      assertMethod(_req, ['GET']);
      return outstandingInvoices(res, url);
    case 'customer-balance':
      assertMethod(_req, ['GET']);
      return customerBalance(res, url);
    default:
      throw errors.notAllowed(url.pathname);
  }
}

async function taxSummary(res: VercelResponse, url: URL) {
  const params = parseQuery(url, reportQuerySchema);
  const db = require('@supabase/supabase-js').createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  let query = db.from('line_items').select('tax_rate, qty, unit_price');
  if (params.start_date) query = query.eq('invoice_date', params.start_date);

  const { data, error } = await query;
  if (error) throw errors.internal();

  const rows = (data ?? []).filter((li: any) => {
    if (params.tax_rate) return li.tax_rate === parseFloat(params.tax_rate);
    return li.tax_rate != null;
  });

  const byRate: Record<string, { sales: number; tax: number }> = {};
  let totalSales = 0;
  let totalTax = 0;

  for (const li of rows) {
    const lineTotal = Number(li.qty) * Number(li.unit_price);
    const taxRate = li.tax_rate ?? 0;
    const tax = (lineTotal * taxRate) / 100;
    totalSales = round2(totalSales + lineTotal);
    totalTax = round2(totalTax + tax);
    if (!byRate[taxRate]) byRate[taxRate] = { sales: 0, tax: 0 };
    byRate[taxRate].sales = round2(byRate[taxRate].sales + lineTotal);
    byRate[taxRate].tax = round2(byRate[taxRate].tax + tax);
  }

  sendJson(res, 200, {
    start_date: params.start_date,
    end_date: params.end_date,
    total_sales: totalSales,
    total_tax: totalTax,
    by_rate: Object.entries(byRate).map(([rate, vals]) => ({
      tax_rate: parseFloat(rate),
      sales: vals.sales,
      tax: vals.tax,
    })),
  });
}

async function revenueReport(res: VercelResponse, url: URL) {
  const params = parseQuery(url, reportQuerySchema);
  const groupBy = params.group_by ?? 'monthly';
  const db = require('@supabase/supabase-js').createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data, error } = await db.from('invoices').select('paid_at, total, status').eq('status', 'paid');
  if (error) throw errors.internal();

  const rows = (data ?? []).filter((inv: any) => inv.paid_at != null);
  const grouped: Record<string, { revenue: number; invoice_count: number }> = {};

  for (const inv of rows) {
    const paidAt = new Date(inv.paid_at);
    let period: string;
    if (groupBy === 'daily') period = paidAt.toISOString().split('T')[0];
    else if (groupBy === 'weekly') period = `W${Math.ceil(paidAt.getUTCDate() / 7)}-${paidAt.getUTCFullYear()}`;
    else period = `${paidAt.getUTCFullYear()}-${String(paidAt.getUTCMonth() + 1).padStart(2, '0')}`;

    if (!grouped[period]) grouped[period] = { revenue: 0, invoice_count: 0 };
    grouped[period].revenue = round2(grouped[period].revenue + (Number(inv.total) || 0));
    grouped[period].invoice_count += 1;
  }

  sendJson(res, 200, {
    start_date: params.start_date,
    end_date: params.end_date,
    group_by: groupBy,
    rows: Object.entries(grouped).map(([period, vals]) => ({
      period,
      revenue: vals.revenue,
      invoice_count: vals.invoice_count,
    })),
  });
}

async function outstandingInvoices(res: VercelResponse, url: URL) {
  const params = parseQuery(url, reportQuerySchema);
  const db = require('@supabase/supabase-js').createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data, error } = await db.from('invoices')
    .select('*, customer:customers(id, name)')
    .in('status', ['sent', 'overdue']);
  if (error) throw errors.internal();

  const now = new Date();
  const rows = (data ?? []).map((inv: any) => {
    const dueDate = new Date(inv.due_date);
    const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / 86400000);
    return {
      invoice_no: inv.invoice_no,
      customer: inv.customer?.name ?? 'Unknown',
      amount: Number(inv.total) || 0,
      due_date: inv.due_date,
      days_overdue: daysOverdue > 0 ? daysOverdue : 0,
    };
  }).filter((r: any) => {
    if (params.days_overdue) return r.days_overdue >= params.days_overdue!;
    return true;
  });

  const totalOutstanding = rows.reduce((sum: number, r: any) => sum + r.amount, 0);

  sendJson(res, 200, {
    filter: params.days_overdue ? `overdue >= ${params.days_overdue} days` : 'all outstanding',
    rows,
    total_outstanding: round2(totalOutstanding),
  });
}

async function customerBalance(res: VercelResponse, _url: URL) {
  const db = require('@supabase/supabase-js').createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: customers, error: custError } = await db.from('customers').select('id, name');
  if (custError) throw errors.internal();

  const rows = [];
  for (const cust of customers ?? []) {
    const { data: invoices, error: invError } = await db
      .from('invoices')
      .select('total, status')
      .eq('customer_id', cust.id)
      .eq('status', 'sent');
    if (invError) continue;

    const totalInvoiced = (invoices ?? []).reduce((sum: number, inv: any) => sum + (Number(inv.total) || 0), 0);

    const { data: paidInvoices } = await db
      .from('invoices')
      .select('total')
      .eq('customer_id', cust.id)
      .eq('status', 'paid');
    const totalPaid = (paidInvoices ?? []).reduce((sum: number, inv: any) => sum + (Number(inv.total) || 0), 0);

    rows.push({
      customer_id: cust.id,
      customer_name: cust.name,
      total_invoiced: round2(totalInvoiced),
      total_paid: round2(totalPaid),
      outstanding: round2(totalInvoiced - totalPaid),
    });
  }

  sendJson(res, 200, { rows });
}
