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
