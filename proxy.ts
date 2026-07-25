import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  AUTHENTICATED_HOME,
  isProtectedPage,
} from "@/lib/auth/protected-routes";

/**
 * Next.js 16+ request proxy (formerly middleware). Protects /dashboard,
 * /chat, /compare, refreshes the auth session cookie, and covers /api/* as
 * defense-in-depth (SECURITY.md §1). API handlers still call requireSession()
 * for JSON 401s — the duplicate getUser() is intentional backstop, not waste
 * to optimize away.
 *
 * Note: App Router route groups (e.g. app/(app)/) are URL-transparent —
 * pathname is still /dashboard, /chat, /compare. Protection is explicit via
 * isProtectedPage(), not inferred from the filesystem.
 */
export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isLogin = pathname === "/login";
  const isApiRoute = pathname.startsWith("/api/");
  const isRoot = pathname === "/";

  // Defense-in-depth for API routes (SECURITY.md §1). Return JSON 401 —
  // never redirect — so fetch() callers can handle the response.
  if (!user && isApiRoute) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!user && isProtectedPage(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = AUTHENTICATED_HOME;
    return NextResponse.redirect(url);
  }

  if (isRoot) {
    const url = request.nextUrl.clone();
    url.pathname = user ? AUTHENTICATED_HOME : "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
