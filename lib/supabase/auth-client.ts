"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Returns true when both NEXT_PUBLIC_SUPABASE_URL and
 * NEXT_PUBLIC_SUPABASE_ANON_KEY are present in the browser bundle.
 * Components can call this to decide whether to render auth UI or a
 * setup-instructions placeholder.
 */
export function isSupabaseAuthConfiguredBrowser(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

/**
 * A typed sentinel error so callers can branch on the missing-env case
 * without string-matching against Supabase's own error messages.
 */
export class SupabaseEnvMissingError extends Error {
  readonly code = "SUPABASE_ENV_MISSING";
  constructor() {
    super(
      "Supabase 还没有配置。请在项目根目录创建 .env.local 并填入 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY，然后重启 dev server。",
    );
    this.name = "SupabaseEnvMissingError";
  }
}

export function createSupabaseAuthBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new SupabaseEnvMissingError();
  }
  return createBrowserClient(url, key);
}
