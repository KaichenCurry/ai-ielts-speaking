import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextPath = requestUrl.searchParams.get("next") || "/practice";
  const safeNextPath = nextPath.startsWith("/") ? nextPath : "/practice";

  if (code) {
    const supabase = await createSupabaseAuthServerClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL(safeNextPath, request.url));
}
