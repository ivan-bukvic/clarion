import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/supabase";

/**
 * Browser Supabase client — auth session only (login/logout, reading the
 * current user). Never used for direct reads/writes on documents,
 * document_chunks, comparisons, etc. — those go through server routes.
 * See SECURITY.md §3.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
