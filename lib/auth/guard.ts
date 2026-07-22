import { createClient } from "@/lib/supabase/server";

/**
 * Auth guard for API routes. Single-user scope (PROJECT_MEMORY.md) — this
 * only checks "is someone logged in", there is no role/permission check
 * since there is exactly one user and one role.
 *
 * Route-level page protection (/chat, /compare) is handled by Next.js
 * middleware — see SECURITY.md §1. This guard is for API routes that need
 * an explicit check before doing server-side work (upload, chat, compare,
 * report download).
 */
export async function requireSession() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { user: null, unauthorized: true as const };
  }

  return { user, unauthorized: false as const };
}
