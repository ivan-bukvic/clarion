/**
 * Pathname checks used by proxy.ts for page-level auth redirects.
 * Kept as a pure helper so route-group moves can be verified without
 * spinning up Next — route groups like (app) do not appear in pathname,
 * but each protected URL must still be listed here explicitly.
 */
export function isProtectedPage(pathname: string): boolean {
  return (
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    pathname === "/chat" ||
    pathname.startsWith("/chat/") ||
    pathname === "/compare" ||
    pathname.startsWith("/compare/")
  );
}

export const PROTECTED_PAGE_PATHS = [
  "/dashboard",
  "/chat",
  "/compare",
] as const;

/** Default landing for authenticated users (Amandman v1.1). */
export const AUTHENTICATED_HOME = "/dashboard";
