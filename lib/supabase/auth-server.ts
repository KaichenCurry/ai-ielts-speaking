import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getOptionalEnv } from "@/lib/supabase/server";

/**
 * Returns true when the public Supabase env vars exist. We check this before
 * touching the SSR client so an unconfigured local dev env can still render
 * unauthenticated pages (landing, login) instead of crashing the root layout.
 */
export function isSupabaseAuthConfigured() {
  return Boolean(
    getOptionalEnv("NEXT_PUBLIC_SUPABASE_URL") && getOptionalEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  );
}

export async function createSupabaseAuthServerClient() {
  if (!isSupabaseAuthConfigured()) {
    throw new Error(
      "Supabase auth is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.",
    );
  }
  const cookieStore = await cookies();

  return createServerClient(
    getOptionalEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getOptionalEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Cookie writes are ignored in server components.
          }
        },
      },
    },
  );
}

export async function getServerUser() {
  // Graceful degrade: if Supabase isn't configured (e.g. fresh clone without
  // .env.local), treat the visitor as anonymous instead of throwing. This keeps
  // the landing page reachable so the user can read setup instructions.
  if (!isSupabaseAuthConfigured()) {
    return null;
  }
  try {
    const supabase = await createSupabaseAuthServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch (error) {
    console.error("getServerUser failed:", error);
    return null;
  }
}

export async function requireServerUser() {
  const user = await getServerUser();

  if (!user) {
    throw new Error("Authentication required.");
  }

  return user;
}

/**
 * Read the user-supplied nickname from Supabase auth metadata.
 * Falls back to the email's local part, and finally to "访客" for
 * anonymous sessions that haven't picked a name yet.
 */
export function getUserDisplayName(user: {
  email?: string | null;
  is_anonymous?: boolean;
  user_metadata?: Record<string, unknown> | null;
} | null | undefined): string {
  if (!user) return "访客";
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const nick = typeof meta.nickname === "string" ? meta.nickname.trim() : "";
  if (nick) return nick;
  const fullName = typeof meta.full_name === "string" ? meta.full_name.trim() : "";
  if (fullName) return fullName;
  if (user.is_anonymous) return "访客";
  if (user.email) {
    const local = user.email.split("@")[0];
    return local || user.email;
  }
  return "用户";
}

export function getAdminEmail() {
  return process.env.ADMIN_EMAIL?.trim().toLowerCase() || "";
}

export function isAdminEmail(email: string | null | undefined) {
  const adminEmail = getAdminEmail();

  if (!adminEmail || !email) {
    return false;
  }

  return email.toLowerCase() === adminEmail;
}
