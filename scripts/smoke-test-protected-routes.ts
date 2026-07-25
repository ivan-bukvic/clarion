/**
 * Verifies isProtectedPage() covers the three app pages after the (app)
 * route-group move. Route groups do not appear in the URL — this asserts
 * the explicit pathname checks still match what the browser requests.
 *
 * Run: npx tsx scripts/smoke-test-protected-routes.ts
 */
import {
  AUTHENTICATED_HOME,
  isProtectedPage,
  PROTECTED_PAGE_PATHS,
} from "../lib/auth/protected-routes";

const mustProtect = [
  "/dashboard",
  "/dashboard/anything",
  "/chat",
  "/chat/anything",
  "/compare",
  "/compare/anything",
];

const mustNotProtect = [
  "/login",
  "/api/chat",
  "/api/compare",
  "/favicon.ico",
  "/(app)/dashboard", // filesystem-only; never a real pathname
  "/(app)/chat",
];

let failed = 0;

for (const path of mustProtect) {
  if (!isProtectedPage(path)) {
    console.error(`FAIL: expected protected: ${path}`);
    failed += 1;
  } else {
    console.log(`ok protected: ${path}`);
  }
}

for (const path of mustNotProtect) {
  if (isProtectedPage(path)) {
    console.error(`FAIL: expected NOT protected: ${path}`);
    failed += 1;
  } else {
    console.log(`ok not protected: ${path}`);
  }
}

if (AUTHENTICATED_HOME !== "/dashboard") {
  console.error(`FAIL: AUTHENTICATED_HOME should be /dashboard`);
  failed += 1;
}

for (const path of PROTECTED_PAGE_PATHS) {
  if (!isProtectedPage(path)) {
    console.error(`FAIL: PROTECTED_PAGE_PATHS entry not covered: ${path}`);
    failed += 1;
  }
}

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}

console.log("\nAll protected-route assertions passed.");
