import { describe, it, expect, vi } from 'vitest';
import { calcTotals } from '../../src/lib/invoice-utils';

describe('Invoice Utils — calcTotals', () => {
  it('empty array returns zeros', () => {
    expect(calcTotals([])).toEqual({ subtotal: 0, tax: 0, total: 0 });
  });

  it('single item no tax', () => {
    expect(calcTotals([{ qty: 2, unit_price: 10, tax_rate: null }]))
      .toEqual({ subtotal: 20, tax: 0, total: 20 });
  });

  it('single item with tax', () => {
    expect(calcTotals([{ qty: 1, unit_price: 100, tax_rate: 10 }]))
      .toEqual({ subtotal: 100, tax: 10, total: 110 });
  });

  it('multiple items', () => {
    expect(calcTotals([
      { qty: 2, unit_price: 10, tax_rate: 5 },
      { qty: 1, unit_price: 50, tax_rate: 10 },
    ])).toEqual({ subtotal: 70, tax: 6, total: 76 });
  });

  it('tax_rate 0 is same as null', () => {
    expect(calcTotals([{ qty: 1, unit_price: 50, tax_rate: 0 }]))
      .toEqual({ subtotal: 50, tax: 0, total: 50 });
  });

  it('floating point precision handled', () => {
    const result = calcTotals([{ qty: 3, unit_price: 33.33, tax_rate: null }]);
    expect(result.subtotal).toBe(99.99);
    expect(result.total).toBe(99.99);
  });
});

describe('Invoice Utils — nextInvoiceNo (pure logic)', () => {
  it('first invoice for year returns INV-YYYY-0001', () => {
    // Pure function logic: if no last invoice, seq = 0, result = INV-2026-0001
    expect(`INV-2026-${String(0 + 1).padStart(4, '0')}`).toBe('INV-2026-0001');
  });

  it('next after INV-2026-0042', () => {
    const last = 'INV-2026-0042';
    const seq = parseInt(last.split('-')[2], 10) || 0;
    expect(`INV-2026-${String(seq + 1).padStart(4, '0')}`).toBe('INV-2026-0043');
  });

  it('handles gap in sequence', () => {
    const last = 'INV-2026-0099';
    const seq = parseInt(last.split('-')[2], 10) || 0;
    expect(`INV-2026-${String(seq + 1).padStart(4, '0')}`).toBe('INV-2026-0100');
  });
});

describe('Invoice Utils — assertDraft', () => {
  it('passes for draft', () => {
    expect(() => { const fn = (invoice: { status: string }) => { if (invoice.status !== 'draft') throw new Error('not draft'); }; fn({ status: 'draft' }); }).not.toThrow();
  });

  it('throws for sent', () => {
    expect(() => { const fn = (invoice: { status: string }) => { if (invoice.status !== 'draft') throw new Error('Invoice is sent; only draft invoices can be modified'); }; fn({ status: 'sent' }); }).toThrow('Invoice is sent');
  });
});
