import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "@/types/supabase";

/**
 * Server-side Supabase client — uses the request's cookies for session auth.
 * Use for auth/session checks only. documents / document_chunks reads and
 * writes go through createServiceRoleClient() after requireSession()
 * (SECURITY.md §3 — no direct anon/authenticated table access).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component - proxy handles session refresh instead.
          }
        },
      },
    }
  );
}

/**
 * Service-role Supabase client — bypasses RLS. Server-only, never import from
 * client components. Used for upload/ingestion, document reads, comparison,
 * and DOCX report generation per SECURITY.md §2–§3.
 */
export function createServiceRoleClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
