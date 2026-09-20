import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.SUPABASE_URL;
const anonKey = import.meta.env.SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env.local');
}

export const supabase = createClient(url, anonKey);
