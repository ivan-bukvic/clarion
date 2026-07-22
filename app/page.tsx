/**
 * Root `/` is handled exclusively by proxy.ts (redirect to /chat or /login).
 * This page is never reached in normal request flow; kept as a minimal
 * App Router stub so the route exists for tooling/build.
 */
export default function HomePage() {
  return null;
}
