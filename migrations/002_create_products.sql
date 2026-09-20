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
