
DO $$
DECLARE
  v_user_id uuid := '92e7f399-2f9b-4c9d-857d-37d155a6c436'::uuid;  -- <-- REPLACE THIS
  v_customer_ids uuid[];
BEGIN
  IF v_user_id = '00000000-0000-0000-0000-000000000000'::uuid THEN
    RAISE EXCEPTION 'Please replace the placeholder UUID before running.';
  END IF;

  -- 5 CUSTOMERS (capture their UUIDs into v_customer_ids array)
  INSERT INTO customers (user_id, name, email, phone, address, city, state, postal_code, country, tax_id, payment_terms, notes, active)
  VALUES
    (v_user_id, 'Acme Corporation', 'billing@acme.com', '+1-555-0100', '123 Main Street', 'Springfield', 'IL', '62701', 'USA', 'ACME123456', 'NET30', 'Long-term customer since 2020', true),
    (v_user_id, 'Globex Inc', 'ap@globex.com', '+1-555-0101', '456 Oak Avenue', 'Metropolis', 'NY', '10001', 'USA', 'GLOBEX789', 'NET15', 'Preferred partner', true),
    (v_user_id, 'Initech', 'orders@initech.com', '+1-555-0102', '789 Tech Park Drive', 'Cupertino', 'CA', '95014', 'USA', 'INITECH456', 'NET30', 'Recurring monthly orders', true),
    (v_user_id, 'Umbrella Company', 'procurement@umbrella.com', '+44-20-7946-0958', '10 Oxford Street', 'London', '', 'W1D 1AN', 'UK', 'UMBRAL123', 'NET30', 'International customer', true),
    (v_user_id, 'Strickland Propane', 'frank@strickland.com', '+1-555-0103', '200 Rural Route 7', 'Smallville', 'KS', '66666', 'USA', '', 'DUE ON RECEIPT', 'Cash on delivery', true)
  RETURNING id INTO v_customer_ids;

  -- 10 PRODUCTS
  INSERT INTO products (user_id, name, description, price, cost, category, tax_rate, active)
  VALUES
    (v_user_id, 'Office Chair', 'Ergonomic mesh office chair', 120.00, 65.00, 'Furniture', 10.00, true),
    (v_user_id, 'Desk Lamp', 'LED desk lamp, adjustable', 45.00, 22.00, 'Lighting', 8.00, true),
    (v_user_id, 'Conference Table', 'Solid oak, seats 10', 890.00, 480.00, 'Furniture', 10.00, true),
    (v_user_id, 'Whiteboard Set', '120x90cm + markers + eraser', 65.00, 30.00, 'Office Supplies', 8.00, true),
    (v_user_id, 'Printer Paper A4', '80gsm, 500 sheets', 8.50, 4.00, 'Office Supplies', 0.00, true),
    (v_user_id, 'Ballpoint Pens (Box of 50)', 'Blue ink, box of 50', 12.00, 5.00, 'Office Supplies', 0.00, true),
    (v_user_id, 'Filing Cabinet 4-Drawer', 'Steel, lockable, 4 drawers', 195.00, 110.00, 'Furniture', 10.00, true),
    (v_user_id, 'Monitor Stand', 'Adjustable aluminum, up to 32"', 55.00, 28.00, 'Equipment', 8.00, true),
    (v_user_id, 'Label Printer', 'Thermal, 50mm, wireless', 140.00, 75.00, 'Equipment', 10.00, true),
    (v_user_id, 'Desk Organizer', 'Bamboo, pen holder + tray', 28.00, 14.00, 'Office Supplies', 8.00, true);

  -- 20 INVOICES using actual customer UUIDs from v_customer_ids array
  -- v_customer_ids[1] = Acme, [2] = Globex, [3] = Initech, [4] = Umbrella, [5] = Strickland
  INSERT INTO invoices (user_id, customer_id, invoice_no, date, due_date, subtotal, tax, total, notes, status)
  VALUES
    (v_user_id, v_customer_ids[1], 'INV-2026-0001', '2026-09-15', '2026-10-15', 0, 0, 0, 'Draft — awaiting line items', 'draft'),
    (v_user_id, v_customer_ids[2], 'INV-2026-0002', '2026-09-18', '2026-10-18', 0, 0, 0, 'Draft — awaiting line items', 'draft'),
    (v_user_id, v_customer_ids[3], 'INV-2026-0003', '2026-09-20', '2026-10-20', 0, 0, 0, 'Draft — awaiting line items', 'draft'),
    (v_user_id, v_customer_ids[4], 'INV-2026-0004', '2026-09-22', '2026-10-22', 0, 0, 0, 'Draft — awaiting line items', 'draft'),
    (v_user_id, v_customer_ids[5], 'INV-2026-0005', '2026-09-25', '2026-10-25', 0, 0, 0, 'Draft — awaiting line items', 'draft'),
    (v_user_id, v_customer_ids[1], 'INV-2026-0006', '2026-08-01', '2026-09-01', 120.00, 12.00, 132.00, 'Office chair Q3 restock', 'sent', '2026-08-01 09:00:00'),
    (v_user_id, v_customer_ids[2], 'INV-2026-0007', '2026-08-05', '2026-09-05', 890.00, 89.00, 979.00, 'Conference table fitout', 'sent', '2026-08-05 10:30:00'),
    (v_user_id, v_customer_ids[3], 'INV-2026-0008', '2026-08-10', '2026-09-10', 140.00, 14.00, 154.00, 'Label printer shipping', 'sent', '2026-08-10 14:00:00'),
    (v_user_id, v_customer_ids[4], 'INV-2026-0009', '2026-08-15', '2026-09-15', 65.00, 5.20, 70.20, 'Whiteboard meeting room', 'sent', '2026-08-15 11:00:00'),
    (v_user_id, v_customer_ids[5], 'INV-2026-0010', '2026-07-01', '2026-08-01', 28.00, 0.00, 28.00, 'Desk organizer, due on receipt', 'sent', '2026-07-01 08:00:00'),
    (v_user_id, v_customer_ids[1], 'INV-2026-0011', '2026-07-15', '2026-08-15', 195.00, 19.50, 214.50, 'Filing cabinet records', 'sent', '2026-07-15 13:00:00'),
    (v_user_id, v_customer_ids[2], 'INV-2026-0012', '2026-06-01', '2026-07-01', 45.00, 3.60, 48.60, 'Desk lamp executive', 'sent', '2026-06-01 09:30:00'),
    (v_user_id, v_customer_ids[3], 'INV-2026-0013', '2026-06-15', '2026-07-15', 120.00, 12.00, 132.00, 'Office chair new hire', 'sent', '2026-06-15 16:00:00'),
    (v_user_id, v_customer_ids[1], 'INV-2026-0014', '2026-05-01', '2026-06-01', 65.00, 5.20, 70.20, 'Whiteboard May restock', 'paid', '2026-05-01 10:00:00', '2026-05-28 15:30:00'),
    (v_user_id, v_customer_ids[2], 'INV-2026-0015', '2026-05-15', '2026-06-15', 55.00, 4.40, 59.40, 'Monitor stand IT upgrade', 'paid', '2026-05-15 11:00:00', '2026-06-10 09:00:00'),
    (v_user_id, v_customer_ids[3], 'INV-2026-0016', '2026-04-01', '2026-05-01', 120.00, 12.00, 132.00, 'Office chairs new hires', 'paid', '2026-04-01 09:00:00', '2026-04-25 14:00:00'),
    (v_user_id, v_customer_ids[4], 'INV-2026-0017', '2026-04-15', '2026-05-15', 890.00, 89.00, 979.00, 'Conference table London', 'paid', '2026-04-15 10:00:00', '2026-05-10 16:00:00'),
    (v_user_id, v_customer_ids[5], 'INV-2026-0018', '2026-03-01', '2026-04-01', 140.00, 14.00, 154.00, 'Label printer warehouse', 'paid', '2026-03-01 08:30:00', '2026-03-20 11:00:00'),
    (v_user_id, v_customer_ids[2], 'INV-2026-0019', '2026-07-20', '2026-08-20', 28.00, 0.00, 28.00, 'Desk organizer past due', 'overdue', '2026-07-20 14:00:00'),
    (v_user_id, v_customer_ids[3], 'INV-2026-0020', '2026-08-01', '2026-08-31', 45.00, 3.60, 48.60, 'Desk lamp past due', 'overdue', '2026-08-01 10:00:00');

  -- LINE ITEMS using invoice IDs captured via subquery
  -- Single-line invoices
  INSERT INTO line_items (invoice_id, product_id, description, qty, unit_price, tax_rate)
  SELECT i.id, 1, 'Office Chair — Ergonomic mesh, lumbar support', 1, 120.00, 10.00
  FROM invoices i WHERE i.invoice_no = 'INV-2026-0006' AND i.user_id = v_user_id;

  INSERT INTO line_items (invoice_id, product_id, description, qty, unit_price, tax_rate)
  SELECT i.id, 9, 'Label Printer — Thermal, 50mm, wireless', 1, 140.00, 10.00
  FROM invoices i WHERE i.invoice_no = 'INV-2026-0008' AND i.user_id = v_user_id;

  -- Multi-line invoices
  INSERT INTO line_items (invoice_id, product_id, description, qty, unit_price, tax_rate)
  SELECT i.id, 5, 'Printer Paper A4 — 80gsm, 500 sheets', 5, 8.50, 0.00
  FROM invoices i WHERE i.invoice_no = 'INV-2026-0006' AND i.user_id = v_user_id;

  INSERT INTO line_items (invoice_id, product_id, description, qty, unit_price, tax_rate)
  SELECT i.id, 2, 'Desk Lamp — LED, adjustable brightness', 4, 45.00, 8.00
  FROM invoices i WHERE i.invoice_no = 'INV-2026-0007' AND i.user_id = v_user_id;

  INSERT INTO line_items (invoice_id, product_id, description, qty, unit_price, tax_rate)
  SELECT i.id, 7, 'Filing Cabinet 4-Drawer — Steel, lockable', 2, 195.00, 10.00
  FROM invoices i WHERE i.invoice_no = 'INV-2026-0017' AND i.user_id = v_user_id;

  INSERT INTO line_items (invoice_id, product_id, description, qty, unit_price, tax_rate)
  SELECT i.id, 4, 'Whiteboard Set — 120x90cm + markers + eraser', 2, 65.00, 8.00
  FROM invoices i WHERE i.invoice_no = 'INV-2026-0016' AND i.user_id = v_user_id;

  INSERT INTO line_items (invoice_id, product_id, description, qty, unit_price, tax_rate)
  SELECT i.id, 4, 'Whiteboard Set — 120x90cm + markers + eraser', 1, 65.00, 8.00
  FROM invoices i WHERE i.invoice_no = 'INV-2026-0014' AND i.user_id = v_user_id;

  INSERT INTO line_items (invoice_id, product_id, description, qty, unit_price, tax_rate)
  SELECT i.id, 8, 'Monitor Stand — Adjustable, aluminum', 1, 55.00, 8.00
  FROM invoices i WHERE i.invoice_no = 'INV-2026-0015' AND i.user_id = v_user_id;

  INSERT INTO line_items (invoice_id, product_id, description, qty, unit_price, tax_rate)
  SELECT i.id, 10, 'Desk Organizer — Bamboo, pen holder + tray', 1, 28.00, 8.00
  FROM invoices i WHERE i.invoice_no = 'INV-2026-0019' AND i.user_id = v_user_id;

  INSERT INTO line_items (invoice_id, product_id, description, qty, unit_price, tax_rate)
  SELECT i.id, 2, 'Desk Lamp — LED, adjustable brightness', 2, 45.00, 8.00
  FROM invoices i WHERE i.invoice_no = 'INV-2026-0020' AND i.user_id = v_user_id;

END $$;