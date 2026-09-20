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
