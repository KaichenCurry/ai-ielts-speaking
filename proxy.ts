import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isAdminEmail } from "./lib/supabase/auth-server";

const AUTH_PATHS = new Set(["/login", "/register"]);
// Pages that anyone can view without being signed in. The landing page (/)
// is public so students see the marketing/CTA surface before deciding to
// register or continue as guest; auth pages are public for obvious reasons.
const PUBLIC_PATHS = new Set(["/", "/login", "/register"]);
const ADMIN_API_PREFIXES = ["/api/review", "/api/bad-case", "/api/rules"];

function isStaticAsset(pathname: string) {
  return pathname.startsWith("/_next") || pathname === "/favicon.ico" || /\.[^/]+$/.test(pathname);
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (isStaticAsset(pathname)) {
    return NextResponse.next();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const cookie of cookiesToSet) {
          request.cookies.set(cookie.name, cookie.value);
        }

        response = NextResponse.next({ request });

        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isApiRoute = pathname.startsWith("/api");
  const isAuthPath = AUTH_PATHS.has(pathname);
  const isAdminPath = pathname.startsWith("/admin");
  const isAdminApi = ADMIN_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const isAdmin = isAdminEmail(user?.email);

  if (!user) {
    // Anyone can hit the public marketing/auth surface signed out.
    if (PUBLIC_PATHS.has(pathname) || pathname.startsWith("/auth/")) {
      return response;
    }

    if (isApiRoute) {
      return jsonError("Authentication required.", 401);
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  // Already signed in: the auth pages should bounce to the product (mock hall).
  if (isAuthPath) {
    return NextResponse.redirect(new URL("/mock", request.url));
  }

  if ((isAdminPath || isAdminApi) && !isAdmin) {
    if (isApiRoute) {
      return jsonError("Admin access required.", 403);
    }

    return NextResponse.redirect(new URL("/mock", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
