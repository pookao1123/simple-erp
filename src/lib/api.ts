/**
 * Simple ERP — API client
 * Calls the Vercel serverless functions at /api/v1/* using the Supabase session token.
 */

import { supabase } from './supabase';

const BASE = '/api/v1';

function getToken(): Promise<string> {
  return supabase.auth.getSession().then(({ data }) => {
    if (!data.session?.access_token) throw new Error('Not authenticated');
    return data.session.access_token;
  });
}

async function call<T>(
  path: string,
  opts: { method?: string; body?: unknown } = {},
): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${BASE}${path}`, {
    method: opts.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const e = (await res.json()) as { error?: { code?: string; message?: string } };
      msg = e.error?.message ?? msg;
    } catch { /* ignore */ }
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ---- Auth ----

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  created_at: string;
}

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_at: string | null;
}

export const apiAuth = {
  async signUp(email: string, password: string, name: string) {
    return call<{ user: AuthUser; session: AuthSession }>('/auth/signup', {
      method: 'POST',
      body: { email, password, name },
    });
  },
  async signIn(email: string, password: string) {
    return call<{ user: AuthUser; session: AuthSession }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
  },
  async signOut() {
    return call<{ message: string }>('/auth/logout', { method: 'POST' });
  },
  async refreshToken(refreshToken: string) {
    return call<{ session: AuthSession }>('/auth/refresh-token', {
      method: 'POST',
      body: { refresh_token: refreshToken },
    });
  },
  async me() {
    return call<{ user: AuthUser }>('/auth/me');
  },
};

// ---- Dashboard ----

export interface DashboardKpis {
  revenue: number;
  revenue_this_month: number;
  invoices_count: number;
  invoices_sent: number;
  invoices_paid: number;
  invoices_overdue: number;
  customers_count: number;
  products_count: number;
  overdue_amount: number;
}

export interface ByMonthRow {
  month: string; // YYYY-MM
  invoice_count: number;
  total_amount: number;
  paid_amount: number;
}

export interface RevenueByCustomerRow {
  customer_id: string;
  customer_name: string;
  email: string;
  total_paid: number;
  invoice_count: number;
}

export const apiDashboard = {
  async kpis() {
    return call<DashboardKpis>('/dashboard/kpis');
  },
  async invoicesByMonth(months = 6) {
    return call<{ data: ByMonthRow[] }>(`/dashboard/invoices-by-month?months=${months}`);
  },
  async revenueByCustomer() {
    return call<{ data: RevenueByCustomerRow[] }>('/dashboard/revenue-by-customer');
  },
};

// ---- Customers ----

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  tax_id: string | null;
  payment_terms: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export const apiCustomers = {
  async list(params: { page?: number; limit?: number; search?: string; active?: boolean | null } = {}) {
    const q = new URLSearchParams();
    if (params.page) q.set('page', String(params.page));
    if (params.limit) q.set('limit', String(params.limit));
    if (params.search) q.set('search', params.search);
    if (params.active !== undefined && params.active !== null) q.set('active', String(params.active));
    const qs = q.toString();
    return call<Paginated<Customer>>(`/customers${qs ? `?${qs}` : ''}`);
  },
  async get(id: string) {
    return call<Customer>(`/customers/${id}`);
  },
  async create(body: {
    name: string;
    email: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
    tax_id?: string;
    payment_terms?: string;
    notes?: string;
    active?: boolean;
  }) {
    return call<Customer>('/customers', { method: 'POST', body });
  },
  async update(id: string, body: Partial<Customer>) {
    return call<Customer>(`/customers/${id}`, { method: 'PUT', body });
  },
  async delete(id: string) {
    return call<{ message: string; id: string }>(`/customers/${id}`, { method: 'DELETE' });
  },
};

// ---- Products ----

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  cost: number | null;
  category: string | null;
  tax_rate: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export const apiProducts = {
  async list(params: { page?: number; limit?: number; search?: string; category?: string; active?: boolean | null } = {}) {
    const q = new URLSearchParams();
    if (params.page) q.set('page', String(params.page));
    if (params.limit) q.set('limit', String(params.limit));
    if (params.search) q.set('search', params.search);
    if (params.category) q.set('category', params.category);
    if (params.active !== undefined && params.active !== null) q.set('active', String(params.active));
    const qs = q.toString();
    return call<Paginated<Product>>(`/products${qs ? `?${qs}` : ''}`);
  },
  async get(id: string) {
    return call<Product>(`/products/${id}`);
  },
  async create(body: {
    name: string;
    description?: string;
    price: number;
    cost?: number;
    category?: string;
    tax_rate?: number;
    active?: boolean;
  }) {
    return call<Product>('/products', { method: 'POST', body });
  },
  async update(id: string, body: Partial<Product>) {
    return call<Product>(`/products/${id}`, { method: 'PUT', body });
  },
  async delete(id: string) {
    return call<{ message: string; id: string }>(`/products/${id}`, { method: 'DELETE' });
  },
};

// ---- Invoices ----

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

export interface LineItem {
  id: string;
  description: string;
  qty: number;
  unit_price: number;
  tax_rate: number;
  amount: number;
  product_id: string | null;
  product: { id: string; name: string } | null;
}

export interface Invoice {
  id: string;
  user_id: string;
  customer_id: string;
  customer: { id: string; name: string; email: string } | null;
  invoice_no: string;
  date: string;
  due_date: string;
  subtotal: number;
  tax: number;
  total: number;
  notes: string | null;
  status: InvoiceStatus;
  sent_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  line_items: LineItem[];
}

export const apiInvoices = {
  async list(params: {
    page?: number;
    limit?: number;
    status?: InvoiceStatus | null;
    customer_id?: string | null;
    date_from?: string | null;
    date_to?: string | null;
    search?: string | null;
    from?: string | null;
    to?: string | null;
  } = {}) {
    const q = new URLSearchParams();
    if (params.page) q.set('page', String(params.page));
    if (params.limit) q.set('limit', String(params.limit));
    if (params.status) q.set('status', params.status);
    if (params.customer_id) q.set('customer_id', params.customer_id);
    // Spec uses from/to; also accept date_from/date_to as aliases for compatibility.
    if (params.from) q.set('from', params.from);
    if (params.to) q.set('to', params.to);
    if (params.date_from && !params.from) q.set('date_from', params.date_from);
    if (params.date_to && !params.to) q.set('date_to', params.date_to);
    if (params.search) q.set('search', params.search);
    const qs = q.toString();
    return call<Paginated<Invoice>>(`/invoices${qs ? `?${qs}` : ''}`);
  },
  async get(id: string) {
    return call<Invoice>(`/invoices/${id}`);
  },
  async create(body: {
    customer_id: string;
    date: string;
    due_date: string;
    notes?: string;
    line_items?: {
      product_id?: string;
      description: string;
      qty: number;
      unit_price: number;
      tax_rate?: number;
    }[];
  }) {
    return call<Invoice>('/invoices', { method: 'POST', body });
  },
  async update(id: string, body: {
    customer_id?: string;
    date?: string;
    due_date?: string;
    notes?: string;
    line_items?: {
      line_id: string;
      description?: string;
      qty?: number;
      unit_price?: number;
      tax_rate?: number;
    }[];
  }) {
    return call<Invoice>(`/invoices/${id}`, { method: 'PUT', body });
  },
  async delete(id: string) {
    return call<{ message: string; id: string }>(`/invoices/${id}`, { method: 'DELETE' });
  },
  async send(id: string, sendEmail?: boolean) {
    return call<{ id: string; invoice_no: string; status: string; sent_at: string }>(
      `/invoices/${id}/send`,
      { method: 'POST', body: { send_email: sendEmail ?? false } },
    );
  },
  async markPaid(id: string, paymentDate?: string) {
    return call<{ id: string; invoice_no: string; status: string; paid_at: string; total: number }>(
      `/invoices/${id}/mark-paid`,
      { method: 'POST', body: { payment_date: paymentDate } },
    );
  },
  // Line items — nested under invoices per spec
  async createLineItem(invoiceId: string, body: {
    product_id?: string;
    description: string;
    qty: number;
    unit_price: number;
    tax_rate?: number;
  }) {
    return call<LineItem>(`/invoices/${invoiceId}/line-items`, {
      method: 'POST',
      body,
    });
  },
  async updateLineItem(invoiceId: string, lineId: string, body: {
    description?: string;
    qty?: number;
    unit_price?: number;
    tax_rate?: number;
  }) {
    return call<LineItem>(`/invoices/${invoiceId}/line-items/${lineId}`, {
      method: 'PUT',
      body,
    });
  },
  async deleteLineItem(invoiceId: string, lineId: string) {
    return call<{ message: string; id: string }>(
      `/invoices/${invoiceId}/line-items/${lineId}`,
      { method: 'DELETE' },
    );
  },
};

export interface AuditLogEntry {
  id: string;
  action: string;
  table_name: string;
  record_id: string;
  record_no?: string;
  user_id: string;
  user_name: string;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  created_at: string;
}

export interface AuditLogPage {
  data: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
}

export const apiAuditLog = {
  async list(params: { page?: number; limit?: number; table?: string }): Promise<AuditLogPage> {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.table) query.set('table', params.table);
    return call<AuditLogPage>(`/audit_log/list?${query}`);
  },
};
