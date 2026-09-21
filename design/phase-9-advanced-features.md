# Phase 9: Advanced Features — Design Doc

**Status:** Reviewed — 8 findings addressed, ready for implementation  
**Date:** 2026-09-21  
**Author:** claude-api  
**Reviewed by:** claude-codereview (2026-09-21)  

**Part of:** [Design Loop Engineering — Meta-Plan](design-loop-engineering-plan.md)  
**Related:** [Phase 4 API Spec](design/phase-4-api-spec.md), [Phase 3 Database Schema](design/phase-3-database-schema.md)

### Review Findings (all resolved)

| # | Severity | Finding | Resolution |
|---|----------|---------|------------|
| 1 | Critical | Invoice status semantics for outstanding invoices | Fixed: outstanding = `sent` + `overdue` (not `draft` + `sent`). Draft excluded. |
| 2 | Critical | Audit log silent failure tradeoff | Documented: silent failure acceptable for MVP, add monitoring alert in production. |
| 3 | Should Fix | User ID threading unclear | Documented: `authenticate(req)` returns `{ userId }`, passed to `logAudit()`. Pattern used in all Phase 5 handlers. |
| 4 | Should Fix | Payment status field missing | Clarified: MVP uses existing `status` field + `paid_at` column. No new column needed. Stripe adds `payment_status` in Phase 10. |
| 5 | Nice-to-Have | Audit log data retention | Added: no cleanup for MVP, >100K rows → Phase 10 cleanup job. |
| 6 | Nice-to-Have | Report query pagination | Added: default limit 100, max 500. Tax/Revenue bounded by time range. |
| 7 | Nice-to-Have | Recurring invoices cron deferral | Clarified: MVP = CRUD + manual generate. Auto-generation deferred to Phase 10. |
| 8 | Nice-to-Have | Audit log RLS depends on user_roles | Added note: user_roles from Phase 3; fallback to simple `auth.uid() = user_id` policy. |

---

## 1. Overview

Phase 9 adds advanced features to the Simple ERP beyond the MVP. Two feature groups are in scope:

**Primary (must implement):**
- **Reports** — Tax summary, revenue report, outstanding invoices report
- **Audit Log** — Track all mutations (create, update, delete) on key entities

**Secondary (if time permits):**
- **Recurring Invoices** — Auto-generate invoices on a schedule (daily/weekly/monthly)
- **Stripe Integration** — Accept payments on invoices (read-only status for MVP; full integration later)

---

## 2. Reports Feature

### 2.1 Overview

Generate printable/downloadable reports from the database. Reports are read-only aggregations with optional date filters.

### 2.2 Report Types

| Report | Description | Key Data |
|--------|-------------|----------|
| **Tax Summary** | VAT/sales tax summary by period | Total sales, total tax collected, by tax rate |
| **Revenue Report** | Revenue over time | Daily/weekly/monthly revenue, by invoice status |
| **Outstanding Invoices** | List of unpaid/overdue invoices | Invoice No, Customer, Amount, Due Date, Days Overdue |
| **Customer Balance** | Per-customer outstanding balance | Customer, Total Invoiced, Total Paid, Outstanding |

### 2.3 API Endpoints

```
GET    /api/v1/reports/tax-summary     ?start_date=&end_date=&tax_rate=
GET    /api/v1/reports/revenue         ?start_date=&end_date=&group_by=(daily|weekly|monthly)
GET    /api/v1/reports/outstanding     ?days_overdue=
GET    /api/v1/reports/customer-balance
```

### 2.4 Request/Response Schemas

**Tax Summary:**
```json
// GET /api/v1/reports/tax-summary?start_date=2026-01-01&end_date=2026-12-31
{
  "start_date": "2026-01-01",
  "end_date": "2026-12-31",
  "total_sales": 150000.00,
  "total_tax": 15000.00,
  "by_rate": [
    { "tax_rate": 10, "sales": 100000.00, "tax": 10000.00 },
    { "tax_rate": 5, "sales": 50000.00, "tax": 2500.00 }
  ]
}
```

**Revenue Report:**
```json
// GET /api/v1/reports/revenue?start_date=2026-01-01&end_date=2026-12-31&group_by=monthly
{
  "start_date": "2026-01-01",
  "end_date": "2026-12-31",
  "group_by": "monthly",
  "rows": [
    { "period": "2026-01", "revenue": 12000.00, "invoice_count": 8 },
    { "period": "2026-02", "revenue": 15000.00, "invoice_count": 10 }
  ]
}
```

**Outstanding Invoices:**
```json
// GET /api/v1/reports/outstanding?days_overdue=30
{
  "filter": "overdue > 30 days",
  "rows": [
    { "invoice_no": "INV-2026-0003", "customer": "Acme Corp", "amount": 2500.00, "due_date": "2026-08-01", "days_overdue": 50 },
    { "invoice_no": "INV-2026-0012", "customer": "Globex Inc", "amount": 800.00, "due_date": "2026-08-15", "days_overdue": 36 }
  ],
  "total_outstanding": 3300.00
}
```

**Customer Balance:**
```json
// GET /api/v1/reports/customer-balance
{
  "rows": [
    { "customer_id": "...", "customer_name": "Acme Corp", "total_invoiced": 15000.00, "total_paid": 12000.00, "outstanding": 3000.00 },
    { "customer_id": "...", "customer_name": "Globex Inc", "total_invoiced": 8000.00, "total_paid": 8000.00, "outstanding": 0.00 }
  ]
}
```

### 2.5 Implementation Notes

- Revenue calculations use `paid_at` (cash basis) for revenue reports — consistent with Phase 4 dashboard KPI design decision
- Tax summary groups by `tax_rate` on line items
- Outstanding invoices: `status IN ('sent', 'overdue')` — invoices that are sent but not yet paid. Overdue is automatically set when `due_date < now` and status is `sent`. Draft invoices are excluded (not yet sent, not outstanding).
- Customer balance: `SUM(total) - SUM(paid_amount)` per customer

---

## 3. Audit Log Feature

### 3.1 Overview

Track all mutations (create, update, delete) on key entities for compliance and debugging. Every change to customers, products, invoices, and line items is recorded.

### 3.2 Database Table

```sql
CREATE TABLE audit_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL,
  action          TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'send', 'mark_paid')),
  table_name      TEXT NOT NULL,
  record_id       UUID NOT NULL,
  old_values      JSONB,
  new_values      JSONB,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_log_user_id    ON audit_log(user_id);
CREATE INDEX idx_audit_log_table_record ON audit_log(table_name, record_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Users can see their own audit entries; admin can see all
CREATE POLICY "Users see own audit entries" ON audit_log
  FOR SELECT USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- Note: user_roles table from Phase 3 provides role-based access. If user_roles
-- doesn't exist, use a simpler policy: auth.uid() = user_id (users see only their own entries).
```

### 3.3 What Gets Logged

| Entity | Actions Logged |
|--------|---------------|
| Customers | create, update, delete |
| Products | create, update, delete (soft-delete) |
| Invoices | create, update, send, mark_paid, delete |
| Line Items | create, update, delete |

### 3.4 API Endpoints

```
GET    /api/v1/audit-log              ?table=&record_id=&start_date=&end_date=&page=&limit=
```

**Response:**
```json
{
  "data": [
    {
      "id": "...",
      "user_id": "...",
      "user_name": "John Doe",
      "action": "update",
      "table_name": "invoices",
      "record_id": "...",
      "record_no": "INV-2026-0005",
      "old_values": { "status": "draft" },
      "new_values": { "status": "sent" },
      "created_at": "2026-09-20T10:30:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

### 3.5 Implementation Approach

**Audit log data retention:** For MVP, no cleanup policy — logs grow with the database. Supabase free tier includes 7-day backups. If audit log grows large (>100K rows), consider adding a monthly cleanup job (delete entries older than 1 year) in Phase 10. Documented here for awareness.

**Report pagination:** Report endpoints return bounded results by default. For large datasets (customer balance could be hundreds of rows), add `limit`/`offset` pagination parameters. Default limit: 100, max: 500. Tax Summary and Revenue Report results are naturally bounded by time range.

**Option A: Trigger-based (recommended for MVP)**
- PostgreSQL trigger on each table captures OLD/NEW rows
- Trigger function inserts into `audit_log` with `auth.uid()` from `current_setting('request.jwt.claims', true)::json->>'sub'`
- Pros: automatic, can't be bypassed, low app code changes
- Cons: requires setting JWT claim in session (works with Supabase RPC)

**How userId is obtained:** Every handler calls `authenticate(req)` from `api/src/lib/auth.ts` which extracts the JWT from the Authorization header and returns `{ userId, token, isAdmin }`. The `userId` (which is the Supabase `auth.users.id`) is passed directly to `logAudit()`. This patterns is used in all Phase 5 handlers (see `api/src/handlers/invoices.ts`, `api/src/handlers/customers.ts`, etc. for examples).

**Example pattern:**
```typescript
import { authenticate } from '../lib/auth';
import { logAudit } from '../lib/audit';

async function createInvoice(req: VercelRequest, res: VercelResponse) {
  const { userId } = await authenticate(req);  // ← userId from JWT
  // ... create invoice ...
  await logAudit(userId, 'create', 'invoices', invoice.id, undefined, invoiceData);
  sendJson(res, 201, invoice);
}
```

### 3.6 Audit Log Helper

```typescript
// api/src/lib/audit.ts
import { getAdminClient } from './supabase-admin';
import { errors } from './error-handler';

export async function logAudit(
  userId: string,
  action: string,
  table: string,
  recordId: string,
  oldValues?: Record<string, unknown>,
  newValues?: Record<string, unknown>,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const { error } = await getAdminClient().from('audit_log').insert({
    user_id: userId,
    action,
    table_name: table,
    record_id: recordId,
    old_values: oldValues ?? null,
    new_values: newValues ?? null,
    metadata: metadata ?? {},
  });
  if (error) {
    console.error('Audit log insert failed:', error);
    // Don't throw — audit failure shouldn't break the main operation.
    // Tradeoff: silent failure means audit may miss entries. For MVP this is acceptable.
    // Production: add monitoring alert on audit insert failures.
  }
}
```

---

## 4. Secondary Features (If Time Permits)

### 4.1 Recurring Invoices

**Concept:** User creates a recurring invoice template (customer, line items, frequency). System auto-generates draft invoices on schedule.

**Schema:**
```sql
CREATE TABLE recurring_invoices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id     UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  frequency      TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
  day_of_month   INT CHECK (day_of_month BETWEEN 1 AND 31),  -- for monthly
  day_of_week    TEXT CHECK (day_of_week IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),  -- for weekly
  notes          TEXT,
  line_items      JSONB NOT NULL,  -- [{ description, qty, unit_price, tax_rate }]
  last_generated  DATE,
  next_due_date  DATE NOT NULL,
  active         BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**API Endpoints:**
```
GET    /api/v1/recurring-invoices
POST   /api/v1/recurring-invoices
GET    /api/v1/recurring-invoices/:id
PUT    /api/v1/recurring-invoices/:id
DELETE /api/v1/recurring-invoices/:id
POST   /api/v1/recurring-invoices/:id/generate   ⬜ generate next invoice now (manual trigger)
```

**Implementation note:** Auto-generation requires a cron/scheduled function. Vercel Cron or Supabase pg_cron can handle this. For MVP, manual trigger only. The `generate` endpoint is included as a manual trigger — user can press "Generate Now" to create the next invoice immediately.

**MVP scope:** CRUD + manual generate endpoint. Auto-generation (scheduled) deferred to Phase 10.

### 4.2 Stripe Integration

**Concept:** Add a "Pay Now" button on paid invoices that redirects to Stripe Checkout.

**MVP scope (status-only):**
- MVP uses existing `status` field on invoices (`paid` vs `sent`/`overdue`/`draft`) to determine paid/unpaid. No new `payment_status` column needed.
- `paid_at` column already tracks when payment was received (cash basis, per Phase 4 design decision).
- If Stripe integration is desired later, add `payment_status` and Stripe metadata columns in Phase 10.
- No actual Stripe integration in MVP — just the data model placeholder.

**Full scope (later):**
- Stripe Checkout for payment
- Webhook to mark invoice as paid when payment received
- Stripe API keys in environment variables

---

## 5. UI Changes

### 5.1 New Pages

| Page | Route | Description |
|------|-------|-------------|
| Reports List | `/reports` | List of available reports with date filters |
| Audit Log | `/audit-log` | Filterable log of all mutations |
| Report Detail | `/reports/:type` | Generated report view (printable) |

### 5.2 Navigation

- Add "Reports" link to sidebar (visible to all authenticated users)
- Add "Audit Log" link to sidebar (admin only, or all users for their own entries)

---

## 6. Implementation Priority

| Priority | Feature | Effort | Dependencies |
|----------|---------|--------|--------------|
| 1 | Audit Log (schema + helper + handlers + UI) | Small | New table only |
| 2 | Reports (4 report endpoints + UI) | Medium | Read-only queries, no schema changes |
| 3 | Recurring Invoices (schema + CRUD + manual trigger) | Medium | New table + cron concept |
| 4 | Stripe Integration (data model only, MVP) | Small | Stripe account setup (optional) |

---

## 7. Verification

| Check | How to Verify |
|-------|---------------|
| Audit log entries created | Create/update/delete a customer, verify audit_log row |
| Audit log filter by table | `GET /api/v1/audit-log?table=invoices` returns only invoice entries |
| Tax summary report | `GET /api/v1/reports/tax-summary` returns correct totals |
| Revenue report grouped by month | `GET /api/v1/reports/revenue?group_by=monthly` returns monthly rows |
| Outstanding invoices | `GET /api/v1/reports/outstanding` returns unpaid/overdue invoices |
| Customer balance | `GET /api/v1/reports/customer-balance` returns per-customer balances |
| Reports UI renders | Visit `/reports`, see report list with filters |
| Audit log UI renders | Visit `/audit-log`, see log entries with filters |

---

**Status:** Approved — all 8 findings resolved, ready for implementation
