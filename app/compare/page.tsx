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
    <main className="mx-auto flex min-h-full w-full max-w-5xl flex-1 flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Compare</h1>
        <p className="text-sm text-muted-foreground">
          Upload or select exactly two comparison documents, then review
          structured differences.
        </p>
      </div>

      <CompareUpload documents={documents ?? []} />
    </main>
  );
}
