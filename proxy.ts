import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  AUTHENTICATED_HOME,
  isProtectedPage,
} from "@/lib/auth/protected-routes";

/**
 * SHA-256-then-XOR compare so match time doesn't depend on where the first
 * differing character is (Edge Runtime has no node:crypto timingSafeEqual;
 * hashing first also normalizes the two inputs to the same fixed length).
 */
async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const [digestA, digestB] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(a)),
    crypto.subtle.digest("SHA-256", enc.encode(b)),
  ]);
  const bytesA = new Uint8Array(digestA);
  const bytesB = new Uint8Array(digestB);
  let diff = 0;
  for (let i = 0; i < bytesA.length; i++) {
    diff |= bytesA[i] ^ bytesB[i];
  }
  return diff === 0;
}

let warnedAboutColonInUser = false;

/**
 * Edge Basic-Auth curtain for the public demo URL (SECURITY.md §1 / §6 #10).
 * Active only when BOTH BASIC_AUTH_USER and BASIC_AUTH_PASSWORD are set.
 * A half-configured pair is treated as disabled (same as unset) but warns,
 * so a missing env var in production is visible in logs instead of silent.
 */
async function enforceBasicAuth(
  request: NextRequest
): Promise<NextResponse | null> {
  const user = process.env.BASIC_AUTH_USER;
  const password = process.env.BASIC_AUTH_PASSWORD;
  const hasUser = Boolean(user);
  const hasPassword = Boolean(password);

  if (!hasUser || !hasPassword) {
    if (hasUser !== hasPassword) {
      console.warn(
        "[proxy] Incomplete Basic-Auth config: set BOTH BASIC_AUTH_USER and BASIC_AUTH_PASSWORD, or neither. Curtain disabled."
      );
    }
    return null;
  }

  // RFC 7617 splits on the first colon, so a colon inside the username
  // itself makes every correctly-submitted credential fail to match.
  if (user!.includes(":") && !warnedAboutColonInUser) {
    warnedAboutColonInUser = true;
    console.warn(
      "[proxy] BASIC_AUTH_USER contains ':' — Basic-Auth credentials split on the first colon, so no submitted password can ever match. Remove the colon from BASIC_AUTH_USER."
    );
  }

  const header = request.headers.get("authorization");
  if (header?.startsWith("Basic ")) {
    try {
      const decoded = atob(header.slice(6));
      const colon = decoded.indexOf(":");
      if (colon !== -1) {
        const providedUser = decoded.slice(0, colon);
        const providedPassword = decoded.slice(colon + 1);
        const [userMatches, passwordMatches] = await Promise.all([
          timingSafeEqual(providedUser, user!),
          timingSafeEqual(providedPassword, password!),
        ]);
        if (userMatches && passwordMatches) {
          return null;
        }
      }
    } catch {
      // Malformed base64 — fall through to 401.
    }
  }

  const isApiRoute = request.nextUrl.pathname.startsWith("/api/");
  const headers = { "WWW-Authenticate": 'Basic realm="Clarion"' };
  return isApiRoute
    ? NextResponse.json({ message: "Unauthorized" }, { status: 401, headers })
    : new NextResponse("Authentication required", { status: 401, headers });
}

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
 *
 * "/" is the public marketing landing page (app/page.tsx) — it is not in
 * isProtectedPage() and is intentionally not redirected here, unlike /login
 * which still bounces a signed-in user to AUTHENTICATED_HOME.
 */
export async function proxy(request: NextRequest) {
  const basicAuthResponse = await enforceBasicAuth(request);
  if (basicAuthResponse) {
    return basicAuthResponse;
  }

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

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
