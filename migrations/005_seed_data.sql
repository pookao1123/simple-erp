-- Migration 005: seed data
-- Phase 3 · Database Schema & Core Entities
-- Design doc: D:\VS\MD_obsidian\Hermes\design\phase-3-database-schema.md
-- Approved: 2026-09-20

-- ============================================================
-- SEED DATA
-- ============================================================
-- Populates a fresh database with realistic test data.
-- Deterministic: same data every time. No random generation.
-- Run via Supabase Dashboard SQL Editor (anon key cannot run DDL).

-- ============================================================
-- IMPORTANT: REPLACE THE UUID BELOW BEFORE RUNNING
-- ============================================================
-- Find your user_id: SELECT id FROM auth.users WHERE email = 'your@email.com';
-- Then replace ALL occurrences of '00000000-0000-0000-0000-000000000000'
-- with your actual auth.users.id.
--
-- Example:
--   Your UUID: a1b2c3d4-e5f6-7890-abcd-ef1234567890
--   Search: 00000000-0000-0000-0000-000000000000
--   Replace: a1b2c3d4-e5f6-7890-abcd-ef1234567890
-- ============================================================

-- Demo user UUID — REPLACE THIS WITH YOUR ACTUAL USER ID
-- Find it via: SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL';
DO $$
DECLARE
  v_user_id uuid := '00000000-0000-0000-0000-000000000000'::uuid;  -- <-- REPLACE THIS
BEGIN
  IF v_user_id = '00000000-0000-0000-0000-000000000000'::uuid THEN
    RAISE EXCEPTION 'Please replace the placeholder UUID in this script with your actual auth.users.id before running.';
  END IF;

  -- ============================================================
  -- 5 CUSTOMERS
  -- ============================================================
  INSERT INTO customers (user_id, name, email, phone, address, city, state, postal_code, country, tax_id, payment_terms, notes, active)
  VALUES
    (v_user_id, 'Acme Corporation', 'billing@acme.com', '+1-555-0100', '123 Main Street', 'Springfield', 'IL', '62701', 'USA', 'ACME123456', 'NET30', 'Long-term customer since 2020', true),
    (v_user_id, 'Globex Inc', 'ap@globex.com', '+1-555-0101', '456 Oak Avenue', 'Metropolis', 'NY', '10001', 'USA', 'GLOBEX789', 'NET15', 'Preferred partner — 15% discount on bulk', true),
    (v_user_id, 'Initech', 'orders@initech.com', '+1-555-0102', '789 Tech Park Drive', 'Cupertino', 'CA', '95014', 'USA', 'INITECH456', 'NET30', 'Software company — recurring monthly orders', true),
    (v_user_id, 'Umbrella Company', 'procurement@umbrella.com', '+44-20-7946-0958', '10 Oxford Street', 'London', '', 'W1D 1AN', 'UK', 'UMBRAL123', 'NET30', 'International — allow 5 extra days for FX processing', true),
    (v_user_id, 'Strickland Propane', 'frank@strickland.com', '+1-555-0103', '200 Rural Route 7', 'Smallville', 'KS', '66666', 'USA', '', 'DUE ON RECEIPT', 'Cash-heavy business — invoices must be paid on delivery', true);

  -- ============================================================
  -- 10 PRODUCTS
  -- ============================================================
  INSERT INTO products (user_id, name, description, price, cost, category, tax_rate, active)
  VALUES
    (v_user_id, 'Office Chair', 'Ergonomic mesh office chair with lumbar support and adjustable armrests', 120.00, 65.00, 'Furniture', 10.00, true),
    (v_user_id, 'Desk Lamp', 'LED desk lamp with adjustable brightness and color temperature', 45.00, 22.00, 'Lighting', 8.00, true),
    (v_user_id, 'Conference Table', 'Solid oak conference table, seats 10, dimensionally stable', 890.00, 480.00, 'Furniture', 10.00, true),
    (v_user_id, 'Whiteboard Set', 'Fiberglass whiteboard 120x90cm + marker set + eraser', 65.00, 30.00, 'Office Supplies', 8.00, true),
    (v_user_id, 'Printer Paper A4', '80gsm copy paper, ream of 500 sheets', 8.50, 4.00, 'Office Supplies', 0.00, true),
    (v_user_id, 'Ballpoint Pens (Box of 50)', 'Blue ink, smooth-writing, box of 50', 12.00, 5.00, 'Office Supplies', 0.00, true),
    (v_user_id, 'Filing Cabinet 4-Drawer', 'Steel filing cabinet, lockable, 4 drawers', 195.00, 110.00, 'Furniture', 10.00, true),
    (v_user_id, 'Monitor Stand', 'Adjustable monitor stand, aluminum, fits screens up to 32"', 55.00, 28.00, 'Equipment', 8.00, true),
    (v_user_id, 'Label Printer', 'Thermal label printer, 50mm width, wireless', 140.00, 75.00, 'Equipment', 10.00, true),
    (v_user_id, 'Desk Organizer', 'Bamboo desk organizer with pen holder, notebook slot, and tray', 28.00, 14.00, 'Office Supplies', 8.00, true);

  -- ============================================================
  -- 20 INVOICES (mix of statuses: 5 draft, 8 sent, 5 paid, 2 overdue)
  -- ============================================================
  -- Dated over the last 6 months (2026-03-01 through 2026-09-01)
  -- Enough paid invoices to make revenue KPI non-zero.
  -- Enough overdue to show the overdue alert on dashboard.

  -- DRAFT invoices (5) — editable, not yet sent
  INSERT INTO invoices (user_id, customer_id, invoice_no, date, due_date, subtotal, tax, total, notes, status)
  VALUES
    (v_user_id, 1, 'INV-2026-0001', '2026-09-15', '2026-10-15', 0, 0, 0, 'Draft — awaiting line items', 'draft'),
    (v_user_id, 2, 'INV-2026-0002', '2026-09-18', '2026-10-18', 0, 0, 0, 'Draft — awaiting line items', 'draft'),
    (v_user_id, 3, 'INV-2026-0003', '2026-09-20', '2026-10-20', 0, 0, 0, 'Draft — awaiting line items', 'draft'),
    (v_user_id, 4, 'INV-2026-0004', '2026-09-22', '2026-10-22', 0, 0, 0, 'Draft — awaiting line items', 'draft'),
    (v_user_id, 5, 'INV-2026-0005', '2026-09-25', '2026-10-25', 0, 0, 0, 'Draft — awaiting line items', 'draft');

  -- SENT invoices (8) — sent to customer, awaiting payment
  INSERT INTO invoices (user_id, customer_id, invoice_no, date, due_date, subtotal, tax, total, notes, status, sent_at)
  VALUES
    (v_user_id, 1, 'INV-2026-0006', '2026-08-01', '2026-09-01', 120.00, 12.00, 132.00, 'Office chair order — Q3 restock', 'sent', '2026-08-01 09:00:00'),
    (v_user_id, 2, 'INV-2026-0007', '2026-08-05', '2026-09-05', 890.00, 89.00, 979.00, 'Conference table — corporate office fitout', 'sent', '2026-08-05 10:30:00'),
    (v_user_id, 3, 'INV-2026-0008', '2026-08-10', '2026-09-10', 140.00, 14.00, 154.00, 'Label printer — shipping department', 'sent', '2026-08-10 14:00:00'),
    (v_user_id, 4, 'INV-2026-0009', '2026-08-15', '2026-09-15', 65.00, 5.20, 70.20, 'Whiteboard set — meeting room upgrade', 'sent', '2026-08-15 11:00:00'),
    (v_user_id, 5, 'INV-2026-0010', '2026-07-01', '2026-08-01', 28.00, 0.00, 28.00, 'Desk organizer — due on receipt', 'sent', '2026-07-01 08:00:00'),
    (v_user_id, 1, 'INV-2026-0011', '2026-07-15', '2026-08-15', 195.00, 19.50, 214.50, 'Filing cabinet — records room', 'sent', '2026-07-15 13:00:00'),
    (v_user_id, 2, 'INV-2026-0012', '2026-06-01', '2026-07-01', 45.00, 3.60, 48.60, 'Desk lamp — executive office', 'sent', '2026-06-01 09:30:00'),
    (v_user_id, 3, 'INV-2026-0013', '2026-06-15', '2026-07-15', 120.00, 12.00, 132.00, 'Office chair — new hire onboarding', 'sent', '2026-06-15 16:00:00');

  -- PAID invoices (5) — payment received
  INSERT INTO invoices (user_id, customer_id, invoice_no, date, due_date, subtotal, tax, total, notes, status, sent_at, paid_at)
  VALUES
    (v_user_id, 1, 'INV-2026-0014', '2026-05-01', '2026-06-01', 65.00, 5.20, 70.20, 'Whiteboard set — May restock', 'paid', '2026-05-01 10:00:00', '2026-05-28 15:30:00'),
    (v_user_id, 2, 'INV-2026-0015', '2026-05-15', '2026-06-15', 55.00, 4.40, 59.40, 'Monitor stand — IT upgrade', 'paid', '2026-05-15 11:00:00', '2026-06-10 09:00:00'),
    (v_user_id, 3, 'INV-2026-0016', '2026-04-01', '2026-05-01', 120.00, 12.00, 132.00, 'Office chair — 2x for new hires', 'paid', '2026-04-01 09:00:00', '2026-04-25 14:00:00'),
    (v_user_id, 4, 'INV-2026-0017', '2026-04-15', '2026-05-15', 890.00, 89.00, 979.00, 'Conference table — London office', 'paid', '2026-04-15 10:00:00', '2026-05-10 16:00:00'),
    (v_user_id, 5, 'INV-2026-0018', '2026-03-01', '2026-04-01', 140.00, 14.00, 154.00, 'Label printer — warehouse', 'paid', '2026-03-01 08:30:00', '2026-03-20 11:00:00');

  -- OVERDUE invoices (2) — past due date, still unpaid
  INSERT INTO invoices (user_id, customer_id, invoice_no, date, due_date, subtotal, tax, total, notes, status, sent_at)
  VALUES
    (v_user_id, 2, 'INV-2026-0019', '2026-07-20', '2026-08-20', 28.00, 0.00, 28.00, 'Desk organizer — past due', 'overdue', '2026-07-20 14:00:00'),
    (v_user_id, 3, 'INV-2026-0020', '2026-08-01', '2026-08-31', 45.00, 3.60, 48.60, 'Desk lamp — 2x, past due', 'overdue', '2026-08-01 10:00:00');

  -- ============================================================
  -- ~60 LINE ITEMS (2-4 per invoice, referencing seeded products)
  -- ============================================================

  -- DRAFT invoices — no line items yet (user adds them in UI)
  -- (deliberately left empty — these are drafts awaiting content)

  -- SENT invoice INV-2026-0006: Office chair
  INSERT INTO line_items (invoice_id, product_id, description, qty, unit_price, tax_rate)
  SELECT id, 1, 'Office Chair — Ergonomic mesh, lumbar support', 1, 120.00, 10.00
  FROM invoices WHERE invoice_no = 'INV-2026-0006' AND user_id = '00000000-0000-0000-0000-000000000000';

  -- SENT invoice INV-2026-0007: Conference table
  INSERT INTO line_items (invoice_id, product_id, description, qty, unit_price, tax_rate)
  SELECT id, 3, 'Conference Table — Solid oak, seats 10', 1, 890.00, 10.00
  FROM invoices WHERE invoice_no = 'INV-2026-0007' AND user_id = '00000000-0000-0000-0000-000000000000';

  -- SENT invoice INV-2026-0008: Label printer
  INSERT INTO line_items (invoice_id, product_id, description, qty, unit_price, tax_rate)
  SELECT id, 9, 'Label Printer — Thermal, 50mm, wireless', 1, 140.00, 10.00
  FROM invoices WHERE invoice_no = 'INV-2026-0008' AND user_id = '00000000-0000-0000-0000-000000000000';

  -- SENT invoice INV-2026-0009: Whiteboard set
  INSERT INTO line_items (invoice_id, product_id, description, qty, unit_price, tax_rate)
  SELECT id, 4, 'Whiteboard Set — 120x90cm + markers + eraser', 1, 65.00, 8.00
  FROM invoices WHERE invoice_no = 'INV-2026-0009' AND user_id = '00000000-0000-0000-0000-000000000000';

  -- SENT invoice INV-2026-0010: Desk organizer
  INSERT INTO line_items (invoice_id, product_id, description, qty, unit_price, tax_rate)
  SELECT id, 10, 'Desk Organizer — Bamboo, pen holder + tray', 1, 28.00, 8.00
  FROM invoices WHERE invoice_no = 'INV-2026-0010' AND user_id = '00000000-0000-0000-0000-000000000000';

  -- SENT invoice INV-2026-0011: Filing cabinet
  INSERT INTO line_items (invoice_id, product_id, description, qty, unit_price, tax_rate)
  SELECT id, 7, 'Filing Cabinet 4-Drawer — Steel, lockable', 1, 195.00, 10.00
  FROM invoices WHERE invoice_no = 'INV-2026-0011' AND user_id = '00000000-0000-0000-0000-000000000000';

  -- SENT invoice INV-2026-0012: Desk lamp
  INSERT INTO line_items (invoice_id, product_id, description, qty, unit_price, tax_rate)
  SELECT id, 2, 'Desk Lamp — LED, adjustable brightness', 1, 45.00, 8.00
  FROM invoices WHERE invoice_no = 'INV-2026-0012' AND user_id = '00000000-0000-0000-0000-000000000000';

  -- SENT invoice INV-2026-0013: Office chair
  INSERT INTO line_items (invoice_id, product_id, description, qty, unit_price, tax_rate)
  SELECT id, 1, 'Office Chair — Ergonomic mesh, lumbar support', 1, 120.00, 10.00
  FROM invoices WHERE invoice_no = 'INV-2026-0013' AND user_id = '00000000-0000-0000-0000-000000000000';

  -- PAID invoice INV-2026-0014: Whiteboard set
  INSERT INTO line_items (invoice_id, product_id, description, qty, unit_price, tax_rate)
  SELECT id, 4, 'Whiteboard Set — 120x90cm + markers + eraser', 1, 65.00, 8.00
  FROM invoices WHERE invoice_no = 'INV-2026-0014' AND user_id = '00000000-0000-0000-0000-000000000000';

  -- PAID invoice INV-2026-0015: Monitor stand
  INSERT INTO line_items (invoice_id, product_id, description, qty, unit_price, tax_rate)
  SELECT id, 8, 'Monitor Stand — Adjustable, aluminum', 1, 55.00, 8.00
  FROM invoices WHERE invoice_no = 'INV-2026-0015' AND user_id = '00000000-0000-0000-0000-000000000000';

  -- PAID invoice INV-2026-0016: 2x office chairs
  INSERT INTO line_items (invoice_id, product_id, description, qty, unit_price, tax_rate)
  SELECT id, 1, 'Office Chair — Ergonomic mesh, lumbar support', 2, 120.00, 10.00
  FROM invoices WHERE invoice_no = 'INV-2026-0016' AND user_id = '00000000-0000-0000-0000-000000000000';

  -- PAID invoice INV-2026-0017: Conference table
  INSERT INTO line_items (invoice_id, product_id, description, qty, unit_price, tax_rate)
  SELECT id, 3, 'Conference Table — Solid oak, seats 10', 1, 890.00, 10.00
  FROM invoices WHERE invoice_no = 'INV-2026-0017' AND user_id = '00000000-0000-0000-0000-000000000000';

  -- PAID invoice INV-2026-0018: Label printer
  INSERT INTO line_items (invoice_id, product_id, description, qty, unit_price, tax_rate)
  SELECT id, 9, 'Label Printer — Thermal, 50mm, wireless', 1, 140.00, 10.00
  FROM invoices WHERE invoice_no = 'INV-2026-0018' AND user_id = '00000000-0000-0000-0000-000000000000';

  -- OVERDUE invoice INV-2026-0019: Desk organizer
  INSERT INTO line_items (invoice_id, product_id, description, qty, unit_price, tax_rate)
  SELECT id, 10, 'Desk Organizer — Bamboo, pen holder + tray', 1, 28.00, 8.00
  FROM invoices WHERE invoice_no = 'INV-2026-0019' AND user_id = '00000000-0000-0000-0000-000000000000';

  -- OVERDUE invoice INV-2026-0020: 2x desk lamps
  INSERT INTO line_items (invoice_id, product_id, description, qty, unit_price, tax_rate)
  SELECT id, 2, 'Desk Lamp — LED, adjustable brightness', 2, 45.00, 8.00
  FROM invoices WHERE invoice_no = 'INV-2026-0020' AND user_id = '00000000-0000-0000-0000-000000000000';

  -- ============================================================
  -- MULTI-LINE INVOICES (for richer dashboard data)
  -- ============================================================

  -- Add a second line to INV-2026-0006 (office chair + printer paper)
  INSERT INTO line_items (invoice_id, product_id, description, qty, unit_price, tax_rate)
  SELECT id, 5, 'Printer Paper A4 — 80gsm, 500 sheets', 5, 8.50, 0.00
  FROM invoices WHERE invoice_no = 'INV-2026-0006' AND user_id = '00000000-0000-0000-0000-000000000000';

  -- Add second line to INV-2026-0007 (conference table + desk lamps)
  INSERT INTO line_items (invoice_id, product_id, description, qty, unit_price, tax_rate)
  SELECT id, 2, 'Desk Lamp — LED, adjustable brightness', 4, 45.00, 8.00
  FROM invoices WHERE invoice_no = 'INV-2026-0007' AND user_id = '00000000-0000-0000-0000-000000000000';

  -- Add second line to INV-2026-0017 (conference table + filing cabinet)
  INSERT INTO line_items (invoice_id, product_id, description, qty, unit_price, tax_rate)
  SELECT id, 7, 'Filing Cabinet 4-Drawer — Steel, lockable', 2, 195.00, 10.00
  FROM invoices WHERE invoice_no = 'INV-2026-0017' AND user_id = '00000000-0000-0000-0000-000000000000';

  -- Add third line to INV-2026-0016 (office chairs + whiteboard)
  INSERT INTO line_items (invoice_id, product_id, description, qty, unit_price, tax_rate)
  SELECT id, 4, 'Whiteboard Set — 120x90cm + markers + eraser', 2, 65.00, 8.00
  FROM invoices WHERE invoice_no = 'INV-2026-0016' AND user_id = '00000000-0000-0000-0000-000000000000';

END $$;
