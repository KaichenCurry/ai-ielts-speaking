import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

/**
 * Whitelist `next` to local same-origin paths only. A naive check that just
 * looks at `startsWith("/")` is bypassed by protocol-relative paths like
 * `//evil.com/x` — `new URL("//evil.com/x", origin)` resolves to
 * `https://evil.com/x` and we'd 302 the just-authed user off-site.
 */
function sanitizeNextPath(raw: string | null): string {
  if (!raw) return "/";
  // Reject protocol-relative (//...), backslash-relative (\\...), absolute URLs,
  // and anything that isn't a single-leading-slash same-origin path.
  if (
    !raw.startsWith("/") ||
    raw.startsWith("//") ||
    raw.startsWith("/\\") ||
    raw.startsWith("\\") ||
    raw.includes("://")
  ) {
    return "/";
  }
  return raw;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const safeNextPath = sanitizeNextPath(requestUrl.searchParams.get("next"));

  if (code) {
    const supabase = await createSupabaseAuthServerClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL(safeNextPath, request.url));
}
