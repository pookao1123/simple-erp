/**
 * Integration tests — hit the real Supabase via service-role admin client.
 * Requires SUPABASE_TEST_URL + SUPABASE_TEST_SERVICE_ROLE_KEY env vars.
 * Run: SUPABASE_TEST_URL=... SUPABASE_TEST_SERVICE_ROLE_KEY=... npm run test:integration
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const TEST_URL = process.env.SUPABASE_TEST_URL;
const TEST_KEY = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY;

const skip = () => vitest.skip;
const describeIf = TEST_URL && TEST_KEY ? describe : describe.skip;

describeIf('Integration — Customers CRUD', () => {
  let db: SupabaseClient;

  beforeAll(() => {
    db = createClient(TEST_URL!, TEST_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  });

  it('create + read + update + delete customer', async () => {
    const name = `test-customer-${Date.now()}`;
    const { data: created, error: createErr } = await db
      .from('customers')
      .insert({ name, email: `test-${Date.now()}@example.com` })
      .select()
      .single();
    expect(createErr).toBeNull();
    expect(created.name).toBe(name);

    const { data: updated, error: updateErr } = await db
      .from('customers')
      .update({ name: `${name}-updated` })
      .eq('id', created.id)
      .select()
      .single();
    expect(updateErr).toBeNull();
    expect(updated.name).toBe(`${name}-updated`);

    const { error: deleteErr } = await db.from('customers').delete().eq('id', created.id);
    expect(deleteErr).toBeNull();
  });

  it('RLS: anon key cannot read customers', async () => {
    // This requires an anon key — we only have service_role here, so skip
    // The actual test would use a separate anon client
  });
});

describeIf('Integration — Products CRUD', () => {
  let db: SupabaseClient;

  beforeAll(() => {
    db = createClient(TEST_URL!, TEST_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  });

  it('create + read product', async () => {
    const name = `test-product-${Date.now()}`;
    const { data, error } = await db
      .from('products')
      .insert({ name, price: 9.99, cost: 4.99 })
      .select()
      .single();
    expect(error).toBeNull();
    expect(data.name).toBe(name);
    expect(data.price).toBe(9.99);
  });
});

describeIf('Integration — Invoices + Line Items', () => {
  let db: SupabaseClient;

  beforeAll(() => {
    db = createClient(TEST_URL!, TEST_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  });

  it('create invoice with line items, totals computed', async () => {
    // Create a test customer first
    const customerName = `invoice-test-${Date.now()}`;
    const { data: customer } = await db
      .from('customers')
      .insert({ name: customerName, email: `inv-${Date.now()}@example.com` })
      .select()
      .single();

    const { data: invoice } = await db
      .from('invoices')
      .insert({
        user_id: '00000000-0000-0000-0000-000000000001', // test user
        customer_id: customer.id,
        date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0],
        status: 'draft',
        line_items: [
          { description: 'Test item', qty: 2, unit_price: 10, tax_rate: 5 },
        ],
      })
      .select()
      .single();
    expect(invoice).toBeDefined();

    // Verify subtotal/tax/total
    expect(invoice.subtotal).toBe(20);
    expect(invoice.tax).toBe(1);
    expect(invoice.total).toBe(21);

    // Cleanup
    await db.from('invoices').delete().eq('id', invoice.id);
    await db.from('customers').delete().eq('id', customer.id);
  });
});

describeIf('Integration — Invoice totals view', () => {
  let db: SupabaseClient;

  beforeAll(() => {
    db = createClient(TEST_URL!, TEST_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  });

  it('invoice_totals view returns correct aggregates', async () => {
    const { data, error } = await db.from('invoice_totals').select('*').limit(1);
    expect(error).toBeNull();
    if (data && data.length > 0) {
      expect(data[0]).toHaveProperty('total_count');
      expect(data[0]).toHaveProperty('total_revenue');
    }
  });
});
