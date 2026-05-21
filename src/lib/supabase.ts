import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";

export function getSupabaseClient() {
  if (!supabaseUrl) return null;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";
  if (!key) return null;
  return createClient(supabaseUrl, key);
}

export function getServiceClient() {
  if (!supabaseUrl) return null;
  const key = process.env.SUPABASE_SECRET_KEY || "";
  if (!key) return null;
  return createClient(supabaseUrl, key);
}
