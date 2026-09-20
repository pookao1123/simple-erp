import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleAuth } from './handlers/auth';
import { handleCustomers } from './handlers/customers';
import { handleDashboard } from './handlers/dashboard';
import { handleInvoices } from './handlers/invoices';
import { handleProducts } from './handlers/products';
import { errors, sendError } from './lib/error-handler';

const ROUTES: Record<string, (req: VercelRequest, res: VercelResponse, url: URL) => Promise<unknown>> = {
  auth: handleAuth,
  customers: handleCustomers,
  products: handleProducts,
  invoices: handleInvoices,
  dashboard: handleDashboard,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const match = /^\/api\/v1\/([^/]+)/.exec(url.pathname);
    const route = match ? ROUTES[match[1]] : undefined;
    if (!route) throw errors.notFound('Endpoint');
    await route(req, res, url);
  } catch (err) {
    sendError(res, err);
  }
}
