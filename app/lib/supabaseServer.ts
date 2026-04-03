/**
 * Server-side Supabase client using the service role key.
 * This bypasses RLS and should ONLY be used in API routes, never in client components.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export function createServiceClient() {
  // Use service role key if available (bypasses RLS), otherwise fall back to anon key
  const key = supabaseServiceKey || supabaseAnonKey;
  return createClient(supabaseUrl, key);
}
