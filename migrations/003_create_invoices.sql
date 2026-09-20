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
