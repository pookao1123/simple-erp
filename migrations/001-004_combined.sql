-- Migration 001: customers table
-- Phase 3 · Database Schema & Core Entities
-- Design doc: D:\VS\MD_obsidian\Hermes\design\phase-3-database-schema.md
-- Approved: 2026-09-20

-- ============================================================
-- TABLE: customers
-- ============================================================
-- Stores customer records for invoice generation.
-- Each row belongs to a user (user_id). RLS enforces isolation.
-- Soft-delete via `active = false` (keeps history for reports).
-- ============================================================

CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  address text,
  city text,
  state text,
  postal_code text,
  country text,
  tax_id text,
  payment_terms text DEFAULT 'NET30',
  notes text,
  active boolean DEFAULT true,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  UNIQUE(user_id, email)
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_customers_user_id
  ON customers(user_id, created_at DESC);
-- Covers: listing queries (most recent first per user)

CREATE INDEX IF NOT EXISTS idx_customers_email
  ON customers(user_id, email);
-- Covers: uniqueness check on (user_id, email) — two users can share the same customer email

-- ============================================================
-- ROW-LEVEL SECURITY
-- ============================================================

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (idempotent)
DROP POLICY IF EXISTS "Users view own customers" ON customers;
DROP POLICY IF EXISTS "Users insert own customers" ON customers;
DROP POLICY IF EXISTS "Users update own customers" ON customers;
DROP POLICY IF EXISTS "Users delete own customers" ON customers;
DROP POLICY IF EXISTS "Admins view all customers" ON customers;

-- SELECT: own rows, or admin sees all
CREATE POLICY "Users view own customers" ON customers
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  );

-- INSERT: own rows only; user_id must be set by the query (not by the client)
CREATE POLICY "Users insert own customers" ON customers
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- UPDATE: own rows only
CREATE POLICY "Users update own customers" ON customers
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- DELETE: own rows only (soft-delete via UPDATE, but policy exists for completeness)
CREATE POLICY "Users delete own customers" ON customers
  FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================================

-- Shared function (created once, reused by all table triggers)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for customers table
DROP TRIGGER IF EXISTS trigger_customers_updated_at ON customers;
CREATE TRIGGER trigger_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
-- Migration 002: products table
-- Phase 3 · Database Schema & Core Entities
-- Design doc: D:\VS\MD_obsidian\Hermes\design\phase-3-database-schema.md
-- Approved: 2026-09-20

-- ============================================================
-- TABLE: products
-- ============================================================
-- Stores product catalog entries.
-- Each row belongs to a user. RLS enforces isolation.
-- Soft-delete via `active = false`.
-- `price` and `cost` are DECIMAL for exact currency math.
-- `tax_rate` is per-product (percentage, e.g. 10.00 = 10%).
-- ============================================================

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price decimal(10,2) NOT NULL CHECK (price >= 0),
  cost decimal(10,2),
  category text,
  tax_rate decimal(5,2) DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_products_user_id
  ON products(user_id, active, name);
-- Covers: listing active products for invoice line item selection

-- ============================================================
-- ROW-LEVEL SECURITY
-- ============================================================

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own products" ON products;
DROP POLICY IF EXISTS "Users insert own products" ON products;
DROP POLICY IF EXISTS "Users update own products" ON products;
DROP POLICY IF EXISTS "Users delete own products" ON products;
DROP POLICY IF EXISTS "Admins view all products" ON products;

-- SELECT: own rows, or admin sees all
CREATE POLICY "Users view own products" ON products
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  );

-- INSERT: own rows only
CREATE POLICY "Users insert own products" ON products
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- UPDATE: own rows only
CREATE POLICY "Users update own products" ON products
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- DELETE: own rows only
CREATE POLICY "Users delete own products" ON products
  FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================================

DROP TRIGGER IF EXISTS trigger_products_updated_at ON products;
CREATE TRIGGER trigger_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
-- Migration 003: invoices table
-- Phase 3 · Database Schema & Core Entities
-- Design doc: D:\VS\MD_obsidian\Hermes\design\phase-3-database-schema.md
-- Approved: 2026-09-20

-- ============================================================
-- TABLE: invoices
-- ============================================================
-- Stores invoice records.
-- Each row belongs to a user. RLS enforces isolation.
-- `customer_id` is FK → customers(id) ON DELETE RESTRICT
--   (don't delete a customer who has outstanding invoices).
-- `invoice_no` is per-user sequence: INV-YYYY-NNNN.
-- `status` is a state machine: draft → sent → paid/overdue/cancelled.
-- Stored totals (subtotal, tax, total) — recalculated in Phase 5 backend.
-- ============================================================

CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  invoice_no text NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date NOT NULL,
  subtotal decimal(12,2) DEFAULT 0,
  tax decimal(12,2) DEFAULT 0,
  total decimal(12,2) DEFAULT 0,
  notes text,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  sent_at timestamp,
  paid_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  UNIQUE(user_id, invoice_no)
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_invoices_user_id
  ON invoices(user_id, created_at DESC);
-- Covers: listing (most recent first per user)

CREATE INDEX IF NOT EXISTS idx_invoices_customer_id
  ON invoices(customer_id);
-- Covers: lookups by customer

CREATE INDEX IF NOT EXISTS idx_invoices_status
  ON invoices(status);
-- Covers: filter by status (draft/sent/paid/overdue)

CREATE INDEX IF NOT EXISTS idx_invoices_invoice_no
  ON invoices(user_id, invoice_no);
-- Covers: uniqueness lookup + invoice_no search

CREATE INDEX IF NOT EXISTS idx_invoices_due_date_status
  ON invoices(due_date, status);
-- Covers: overdue detection query: WHERE due_date < today AND status = 'sent'

-- ============================================================
-- ROW-LEVEL SECURITY
-- ============================================================

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own invoices" ON invoices;
DROP POLICY IF EXISTS "Users insert own invoices" ON invoices;
DROP POLICY IF EXISTS "Users update own invoices draft only" ON invoices;
DROP POLICY IF EXISTS "Users delete own invoices" ON invoices;
DROP POLICY IF EXISTS "Admins view all invoices" ON invoices;

-- SELECT: own rows, or admin sees all
CREATE POLICY "Users view own invoices" ON invoices
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  );

-- INSERT: own rows only
CREATE POLICY "Users insert own invoices" ON invoices
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- UPDATE: own rows, draft status only
-- Prevents editing sent/paid/cancelled/overdue invoices via direct DB access.
-- Phase 5 backend uses dedicated functions for status transitions.
CREATE POLICY "Users update own invoices draft only" ON invoices
  FOR UPDATE
  USING (
    user_id = auth.uid()
    AND status = 'draft'
  )
  WITH CHECK (
    user_id = auth.uid()
    AND status = 'draft'
  );

-- DELETE: own rows only (drafts only — sent/paid invoices should not be deleted)
CREATE POLICY "Users delete own invoices" ON invoices
  FOR DELETE
  USING (user_id = auth.uid() AND status = 'draft');

-- ============================================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================================

DROP TRIGGER IF EXISTS trigger_invoices_updated_at ON invoices;
CREATE TRIGGER trigger_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- VIEW: invoice_totals (helper for dashboard + detail views)
-- ============================================================
-- Joins line_items to show subtotal from line items.
-- Reads stored subtotal/tax/total from invoices (source of truth).
-- RLS on invoices + line_items protects this view from cross-user access.
-- ============================================================

CREATE OR REPLACE VIEW invoice_totals AS
SELECT
  i.id,
  i.user_id,
  i.customer_id,
  i.invoice_no,
  i.status,
  i.date,
  i.due_date,
  COALESCE(SUM(li.amount), 0) AS line_items_subtotal,
  i.subtotal,
  i.tax,
  i.total
FROM invoices i
LEFT JOIN line_items li ON i.id = li.invoice_id
GROUP BY i.id, i.user_id, i.customer_id, i.invoice_no, i.status, i.date, i.due_date, i.subtotal, i.tax, i.total;
-- Migration 004: line_items table
-- Phase 3 · Database Schema & Core Entities
-- Design doc: D:\VS\MD_obsidian\Hermes\design\phase-3-database-schema.md
-- Approved: 2026-09-20

-- ============================================================
-- TABLE: line_items
-- ============================================================
-- Stores individual line items on an invoice.
-- Each line belongs to an invoice (invoice_id FK → invoices(id) ON DELETE CASCADE).
-- `product_id` is FK → products(id) ON DELETE SET NULL
--   (if product is deleted, line survives with description + unit_price intact).
-- `amount` is GENERATED ALWAYS AS (qty * unit_price) STORED — always correct.
--   NULL-safety: qty has CHECK (qty > 0) NOT NULL; unit_price is NOT NULL.
--   Neither operand can be NULL, so amount is never NULL.
-- ============================================================

CREATE TABLE IF NOT EXISTS line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  description text NOT NULL,
  qty decimal(10,2) NOT NULL DEFAULT 1 CHECK (qty > 0),
  unit_price decimal(10,2) NOT NULL CHECK (unit_price >= 0),
  tax_rate decimal(5,2) DEFAULT 0,
  amount decimal(12,2) GENERATED ALWAYS AS (qty * unit_price) STORED,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_line_items_invoice_id
  ON line_items(invoice_id);
-- Covers: fetch all line items for an invoice

-- ============================================================
-- ROW-LEVEL SECURITY
-- ============================================================

ALTER TABLE line_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own line items" ON line_items;
DROP POLICY IF EXISTS "Users insert own line items" ON line_items;
DROP POLICY IF EXISTS "Users update own line items" ON line_items;
DROP POLICY IF EXISTS "Users delete own line items" ON line_items;
DROP POLICY IF EXISTS "Admins view all line items" ON line_items;

-- SELECT: line items belong to the user's invoices, or admin sees all
CREATE POLICY "Users view own line items" ON line_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_id
        AND invoices.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  );

-- INSERT: line items belong to the user's invoices
CREATE POLICY "Users insert own line items" ON line_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_id
        AND invoices.user_id = auth.uid()
    )
  );

-- UPDATE: line items belong to the user's invoices
CREATE POLICY "Users update own line items" ON line_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_id
        AND invoices.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_id
        AND invoices.user_id = auth.uid()
    )
  );

-- DELETE: line items belong to the user's invoices
CREATE POLICY "Users delete own line items" ON line_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_id
        AND invoices.user_id = auth.uid()
    )
  );

-- ============================================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================================

DROP TRIGGER IF EXISTS trigger_line_items_updated_at ON line_items;
CREATE TRIGGER trigger_line_items_updated_at
  BEFORE UPDATE ON line_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
