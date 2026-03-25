import { createClient } from "@supabase/supabase-js";

export function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getOptionalEnv(name: string) {
  return process.env[name]?.trim() || "";
}

export function isSupabaseConfigured() {
  return Boolean(getOptionalEnv("SUPABASE_URL") && getOptionalEnv("SUPABASE_SERVICE_ROLE_KEY"));
}

export function createSupabaseServerClient() {
  return createClient(getRequiredEnv("SUPABASE_URL"), getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
