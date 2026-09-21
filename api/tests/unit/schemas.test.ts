import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  signupSchema,
  loginSchema,
  refreshSchema,
  customerCreateSchema,
  customerUpdateSchema,
  customerListSchema,
  productCreateSchema,
  productUpdateSchema,
  productListSchema,
  invoiceCreateSchema,
  invoiceUpdateSchema,
  invoiceListSchema,
  sendInvoiceSchema,
  markPaidSchema,
  lineItemCreateSchema,
  lineItemUpdateSchema,
  byMonthSchema,
} from '../../src/lib/schemas';

describe('Schemas — Auth', () => {
  it('signupSchema: valid data passes', () => {
    expect(() => signupSchema.parse({ email: 'a@b.com', password: '12345678' })).not.toThrow();
  });

  it('signupSchema: missing email fails', () => {
    expect(() => signupSchema.parse({ password: '12345678' })).toThrow();
  });

  it('signupSchema: invalid email fails', () => {
    expect(() => signupSchema.parse({ email: 'notanemail', password: '12345678' })).toThrow();
  });

  it('signupSchema: short password fails', () => {
    expect(() => signupSchema.parse({ email: 'a@b.com', password: '1234567' })).toThrow();
  });

  it('signupSchema: name optional', () => {
    expect(() => signupSchema.parse({ email: 'a@b.com', password: '12345678', name: 'John' })).not.toThrow();
  });

  it('signupSchema: name max 100 chars', () => {
    expect(() => signupSchema.parse({ email: 'a@b.com', password: '12345678', name: 'x'.repeat(101) })).toThrow();
  });

  it('loginSchema: valid data passes', () => {
    expect(() => loginSchema.parse({ email: 'a@b.com', password: 'secret' })).not.toThrow();
  });

  it('loginSchema: empty password fails', () => {
    expect(() => loginSchema.parse({ email: 'a@b.com', password: '' })).toThrow();
  });

  it('refreshSchema: valid data passes', () => {
    expect(() => refreshSchema.parse({ refresh_token: 'abc' })).not.toThrow();
  });

  it('refreshSchema: missing token fails', () => {
    expect(() => refreshSchema.parse({})).toThrow();
  });
});

describe('Schemas — Customers', () => {
  it('customerCreateSchema: valid data passes', () => {
    expect(() => customerCreateSchema.parse({
      name: 'Acme',
      email: 'billing@acme.com',
      phone: '555-0100',
      address: '123 Main St',
      city: 'Springfield',
      state: 'IL',
      postal_code: '62701',
      country: 'US',
      tax_id: '12-3456789',
      payment_terms: 'Net 30',
      notes: 'Good customer',
      active: true,
    })).not.toThrow();
  });

  it('customerCreateSchema: name required', () => {
    expect(() => customerCreateSchema.parse({ email: 'a@b.com' })).toThrow();
  });

  it('customerCreateSchema: name max 200 chars', () => {
    expect(() => customerCreateSchema.parse({ name: 'x'.repeat(201), email: 'a@b.com' })).toThrow();
  });

  it('customerCreateSchema: email required + max 255', () => {
    expect(() => customerCreateSchema.parse({ name: 'Acme' })).toThrow();
    expect(() => customerCreateSchema.parse({ name: 'Acme', email: 'x'.repeat(256) + '@x.com' })).toThrow();
  });

  it('customerCreateSchema: phone max 50', () => {
    expect(() => customerCreateSchema.parse({ name: 'Acme', email: 'a@b.com', phone: 'x'.repeat(51) })).toThrow();
  });

  it('customerUpdateSchema: all fields optional', () => {
    expect(() => customerUpdateSchema.parse({})).not.toThrow();
    expect(() => customerUpdateSchema.parse({ name: 'New Name' })).not.toThrow();
  });
});

describe('Schemas — Products', () => {
  it('productCreateSchema: valid data passes', () => {
    expect(() => productCreateSchema.parse({
      name: 'Widget',
      description: 'A fine widget',
      price: 9.99,
      cost: 4.50,
      category: 'Tools',
      tax_rate: 10,
      active: true,
    })).not.toThrow();
  });

  it('productCreateSchema: name required, price required', () => {
    expect(() => productCreateSchema.parse({})).toThrow();
    expect(() => productCreateSchema.parse({ name: 'Widget' })).toThrow();
    expect(() => productCreateSchema.parse({ price: 9.99 })).toThrow();
  });

  it('productCreateSchema: negative price fails', () => {
    expect(() => productCreateSchema.parse({ name: 'Widget', price: -1 })).toThrow();
  });

  it('productCreateSchema: price max 99999999.99', () => {
    expect(() => productCreateSchema.parse({ name: 'Widget', price: 100000000 })).toThrow();
  });

  it('productCreateSchema: tax_rate 0-100', () => {
    expect(() => productCreateSchema.parse({ name: 'Widget', price: 10, tax_rate: 0 })).not.toThrow();
    expect(() => productCreateSchema.parse({ name: 'Widget', price: 10, tax_rate: 100 })).not.toThrow();
    expect(() => productCreateSchema.parse({ name: 'Widget', price: 10, tax_rate: -1 })).toThrow();
    expect(() => productCreateSchema.parse({ name: 'Widget', price: 10, tax_rate: 101 })).toThrow();
  });

  it('productUpdateSchema: all fields optional', () => {
    expect(() => productUpdateSchema.parse({})).not.toThrow();
  });
});

describe('Schemas — Invoices', () => {
  const today = new Date().toISOString().split('T')[0];

  it('invoiceCreateSchema: valid data passes', () => {
    expect(() => invoiceCreateSchema.parse({
      customer_id: '00000000-0000-0000-0000-000000000001',
      date: today,
      due_date: today,
      notes: 'Test invoice',
      line_items: [{ description: 'Item 1', qty: 2, unit_price: 10 }],
    })).not.toThrow();
  });

  it('invoiceCreateSchema: customer_id required uuid', () => {
    expect(() => invoiceCreateSchema.parse({ date: today, due_date: today })).toThrow();
    expect(() => invoiceCreateSchema.parse({ customer_id: 'not-a-uuid', date: today, due_date: today })).toThrow();
  });

  it('invoiceCreateSchema: date defaults to today', () => {
    const result = invoiceCreateSchema.parse({ customer_id: '00000000-0000-0000-0000-000000000001', due_date: today });
    expect(result.date).toBe(today);
  });

  it('invoiceCreateSchema: due_date before date fails', () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    expect(() => invoiceCreateSchema.parse({
      customer_id: '00000000-0000-0000-0000-000000000001',
      date: today,
      due_date: yesterday,
    })).toThrow();
  });

  it('invoiceUpdateSchema: all fields optional', () => {
    expect(() => invoiceUpdateSchema.parse({})).not.toThrow();
    expect(() => invoiceUpdateSchema.parse({
      customer_id: '00000000-0000-0000-0000-000000000001',
      notes: 'Updated',
    })).not.toThrow();
  });

  it('invoiceUpdateSchema: line_items with line_id', () => {
    expect(() => invoiceUpdateSchema.parse({
      line_items: [{ line_id: '00000000-0000-0000-0000-000000000001', description: 'Updated item', qty: 5 }],
    })).not.toThrow();
  });
});

describe('Schemas — Line Items', () => {
  it('lineItemCreateSchema: valid data passes', () => {
    expect(() => lineItemCreateSchema.parse({
      description: 'Widget',
      qty: 2,
      unit_price: 10,
      tax_rate: 5,
    })).not.toThrow();
  });

  it('lineItemCreateSchema: empty description rejected', () => {
    // description is optional — absent is fine, empty string fails min(1)
    expect(() => lineItemCreateSchema.parse({ qty: 1, unit_price: 10 })).not.toThrow();
    expect(() => lineItemCreateSchema.parse({ description: '', qty: 1, unit_price: 10 })).toThrow();
  });

  it('lineItemCreateSchema: qty min 0.01', () => {
    expect(() => lineItemCreateSchema.parse({ description: 'Item', qty: 0, unit_price: 10 })).toThrow();
    expect(() => lineItemCreateSchema.parse({ description: 'Item', qty: 0.001, unit_price: 10 })).toThrow();
  });

  it('lineItemCreateSchema: negative price fails', () => {
    expect(() => lineItemCreateSchema.parse({ description: 'Item', qty: 1, unit_price: -1 })).toThrow();
  });

  it('lineItemUpdateSchema: all fields optional', () => {
    expect(() => lineItemUpdateSchema.parse({})).not.toThrow();
  });
});

describe('Schemas — Pagination', () => {
  it('pageSchema: defaults to page=1, limit=20', () => {
    const result = z.object({}).extend({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
    }).parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it('pageSchema: invalid page/limit coerced', () => {
    const Schema = z.object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
    });
    expect(Schema.parse({ page: '2', limit: '50' })).toEqual({ page: 2, limit: 50 });
  });

  it('byMonthSchema: defaults to 6 months, max 24', () => {
    expect(byMonthSchema.parse({})).toEqual({ months: 6 });
    expect(() => byMonthSchema.parse({ months: 25 })).toThrow();
    expect(() => byMonthSchema.parse({ months: 0 })).toThrow();
  });
});

describe('Schemas — Dashboard', () => {
  it('byMonthSchema: valid months', () => {
    expect(byMonthSchema.parse({ months: 12 })).toEqual({ months: 12 });
  });
});
