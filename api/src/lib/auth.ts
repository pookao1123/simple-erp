import type { VercelRequest } from '@vercel/node';
import type { User } from '@supabase/supabase-js';
import { errors } from './error-handler';
import { getAdminClient } from './supabase-admin';

export interface AuthContext {
  userId: string;
  isAdmin: boolean;
  token: string;
  user: User;
}

export function extractToken(req: VercelRequest): string {
  const header = req.headers.authorization;
  const match = typeof header === 'string' ? /^Bearer\s+(\S+)$/i.exec(header) : null;
  if (!match) throw errors.unauthorized('Missing Authorization: Bearer token');
  return match[1];
}

export async function getRole(userId: string): Promise<string> {
  const { data } = await getAdminClient()
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();
  return data?.role ?? 'employee';
}

/**
 * Validates the bearer token against Supabase Auth (signature + expiry), then resolves the role.
 * Verifying server-side matters: the admin client bypasses RLS, so a merely-decoded JWT would let
 * anyone forge a user_id.
 */
export async function authenticate(req: VercelRequest): Promise<AuthContext> {
  const token = extractToken(req);
  const { data, error } = await getAdminClient().auth.getUser(token);
  if (error || !data.user) throw errors.unauthorized('Invalid or expired token');
  const role = await getRole(data.user.id);
  return { userId: data.user.id, isAdmin: role === 'admin', token, user: data.user };
}

/** Restrict a query to the caller's own rows unless admin. */
export function scope<T>(query: T, auth: AuthContext): T {
  return auth.isAdmin ? query : (query as any).eq('user_id', auth.userId);
}
