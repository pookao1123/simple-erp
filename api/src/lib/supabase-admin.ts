import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { errors } from './error-handler';

const CLIENT_OPTIONS = { auth: { persistSession: false, autoRefreshToken: false } };

let adminClient: SupabaseClient | undefined;

function requireUrl(): string {
  const url = process.env.SUPABASE_URL;
  if (!url) throw errors.internal('Server configuration error: SUPABASE_URL not set');
  return url;
}

/** service_role client — bypasses RLS. Never use it for user sign-in (it would adopt the user session). */
export function getAdminClient(): SupabaseClient {
  if (adminClient) return adminClient;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw errors.internal('Server configuration error: SUPABASE_SERVICE_ROLE_KEY not set');
  adminClient = createClient(requireUrl(), key, CLIENT_OPTIONS);
  return adminClient;
}

/** Fresh anon-key client per call for signUp / signIn / refresh, so sessions never leak between requests. */
export function createAuthClient(): SupabaseClient {
  const key = process.env.SUPABASE_ANON_KEY;
  if (!key) throw errors.internal('Server configuration error: SUPABASE_ANON_KEY not set');
  return createClient(requireUrl(), key, CLIENT_OPTIONS);
}
