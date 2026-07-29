import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/guard";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { CompareUpload } from "@/components/compare/compare-upload";

export default async function ComparePage() {
  const { unauthorized } = await requireSession();
  if (unauthorized) {
    redirect("/login");
  }

  const supabase = createServiceRoleClient();
  const { data: documents, error } = await supabase
    .from("documents")
    .select("*")
    .eq("purpose", "comparison")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load comparison documents", error);
  }

  return (
    <div className="min-h-0 w-full flex-1 overflow-y-auto">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Compare</h1>
          <p className="text-muted-foreground text-sm">
            Upload or select exactly two comparison documents, then review
            structured differences.
          </p>
        </div>

        <CompareUpload documents={documents ?? []} />
      </main>
    </div>
  );
}
