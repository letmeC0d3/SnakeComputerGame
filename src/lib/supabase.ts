import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;

export const hasSupabaseCreds = !!(supabaseUrl && supabaseServiceKey);

/**
 * Supabase client instance. Will be null if credentials are not configured,
 * triggering the application's fallback data layers.
 */
export const supabase = hasSupabaseCreds
  ? createClient(supabaseUrl!, supabaseServiceKey!)
  : null;

if (!hasSupabaseCreds && typeof window === "undefined" && process.env.NODE_ENV === "development") {
  console.warn(
    "⚠️ WARNING: Supabase environment variables are not configured. " +
    "The application will run using mock/local-storage leaderboard data in development."
  );
}
