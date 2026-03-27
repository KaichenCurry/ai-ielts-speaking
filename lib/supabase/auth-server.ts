import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getRequiredEnv } from "@/lib/supabase/server";

export async function createSupabaseAuthServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
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
  const supabase = await createSupabaseAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function requireServerUser() {
  const user = await getServerUser();

  if (!user) {
    throw new Error("Authentication required.");
  }

  return user;
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
