import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Creates a Supabase client without cookies for public data fetching.
 * Use this for Server Components that only read public data (no auth needed).
 * This avoids the "Browser Restriction Detected" cookie warning in v0 preview.
 */
export function createPublicClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createSupabaseClient(supabaseUrl, supabaseAnonKey);
}
