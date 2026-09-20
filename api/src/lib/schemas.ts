import { z } from 'zod';

const dateStr = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')
  .refine((v) => !Number.isNaN(Date.parse(v)), 'Invalid date');

const today = () => new Date().toISOString().split('T')[0];

// ---- Auth ----
export const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  name: z.string().min(1).max(100).optional(),
});
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export const refreshSchema = z.object({ refresh_token: z.string().min(1) });

// ---- Pagination ----
export const pageSchema = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};
const boolFlag = z
  .enum(['true', 'false'])
  .optional()
  .transform((v) => (v === undefined ? undefined : v === 'true'));

// ---- Customers ----
export const customerCreateSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(255),
  phone: z.string().max(50).optional(),
  address: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  postal_code: z.string().max(20).optional(),
  country: z.string().max(100).optional(),
  tax_id: z.string().max(50).optional(),
  payment_terms: z.string().max(50).optional(),
  notes: z.string().max(1000).optional(),
  active: z.boolean().optional(),
});
export const customerUpdateSchema = customerCreateSchema.partial();
export const customerListSchema = z.object({
  ...pageSchema,
  search: z.string().max(100).optional(),
  q: z.string().max(100).optional(),
  active: boolFlag,
});

// ---- Products ----
export const productCreateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  price: z.number().min(0).max(99999999.99),
  cost: z.number().min(0).max(99999999.99).optional(),
  category: z.string().max(100).optional(),
  tax_rate: z.number().min(0).max(100).optional(),
  active: z.boolean().optional(),
});
export const productUpdateSchema = productCreateSchema.partial();
export const productListSchema = z.object({
  ...pageSchema,
  search: z.string().max(100).optional(),
  q: z.string().max(100).optional(),
  active: boolFlag,
  category: z.string().max(100).optional(),
});

// ---- Invoices ----
const invoiceLineCreate = z.object({
  product_id: z.string().uuid().optional(),
  description: z.string().min(1).max(500),
  qty: z.number().min(0.01),
  unit_price: z.number().min(0),
  tax_rate: z.number().min(0).max(100).optional(),
});

export const invoiceCreateSchema = z
  .object({
    customer_id: z.string().uuid(),
    date: dateStr.optional().transform((v) => v ?? today()),
    due_date: dateStr,
    notes: z.string().max(1000).optional(),
    line_items: z.array(invoiceLineCreate).optional(),
  })
  .refine((d) => d.due_date >= d.date, {
    message: 'due_date must be on or after date',
    path: ['due_date'],
  });

export const invoiceUpdateSchema = z.object({
  customer_id: z.string().uuid().optional(),
  date: dateStr.optional(),
  due_date: dateStr.optional(),
  notes: z.string().max(1000).optional(),
  line_items: z
    .array(
      z.object({
        line_id: z.string().uuid(),
        description: z.string().min(1).max(500).optional(),
        qty: z.number().min(0.01).optional(),
        unit_price: z.number().min(0).optional(),
        tax_rate: z.number().min(0).max(100).optional(),
      }),
    )
    .optional(),
});

export const invoiceListSchema = z.object({
  ...pageSchema,
  status: z.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled']).optional(),
  customer_id: z.string().uuid().optional(),
  date_from: dateStr.optional(),
  date_to: dateStr.optional(),
  from: dateStr.optional(),
  to: dateStr.optional(),
  search: z.string().max(100).optional(),
  q: z.string().max(100).optional(),
});

export const sendInvoiceSchema = z.object({ send_email: z.boolean().optional() });
export const markPaidSchema = z.object({ payment_date: dateStr.optional() });

// ---- Line items ----
export const lineItemCreateSchema = z.object({
  product_id: z.string().uuid().optional(),
  description: z.string().min(1).max(500).optional(),
  qty: z.number().min(0.01),
  unit_price: z.number().min(0),
  tax_rate: z.number().min(0).max(100).optional(),
});
export const lineItemUpdateSchema = z.object({
  description: z.string().min(1).max(500).optional(),
  qty: z.number().min(0.01).optional(),
  unit_price: z.number().min(0).optional(),
  tax_rate: z.number().min(0).max(100).optional(),
});

// ---- Dashboard ----
export const byMonthSchema = z.object({ months: z.coerce.number().int().min(1).max(24).default(6) });
