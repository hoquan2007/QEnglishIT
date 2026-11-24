import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/**
 * Cookie-less Supabase client for public content (anon role).
 * Because it never touches `cookies()`, pages using it can be statically
 * generated / ISR-cached instead of being rendered on every request.
 * Never use it for per-user data.
 */
export function supabasePublic(): SupabaseClient {
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
    );
  }
  return client;
}
