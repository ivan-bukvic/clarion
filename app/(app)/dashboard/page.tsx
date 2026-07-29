import Link from "next/link";
import { redirect } from "next/navigation";
import { Diff, FileText, MessageSquare, type LucideIcon } from "lucide-react";
import { requireSession } from "@/lib/auth/guard";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { documentStatusVariant } from "@/components/chat/document-list";
import { cn } from "@/lib/utils";
import type { Tables } from "@/types/supabase";

type DocumentRow = Tables<"documents">;
type ComparisonRow = Tables<"comparisons">;

type RecentComparison = ComparisonRow & {
  document_a_title: string;
  document_b_title: string;
  findings_count: number;
};

async function countExact(
  supabase: ReturnType<typeof createServiceRoleClient>,
  table: "documents" | "comparisons" | "comparison_findings" | "chat_sessions"
): Promise<number> {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });

  if (error) {
    console.error(`Failed to count ${table}`, error);
    return 0;
  }

  return count ?? 0;
}

export default async function DashboardPage() {
  const { unauthorized } = await requireSession();
  if (unauthorized) {
    redirect("/login");
  }

  const supabase = createServiceRoleClient();

  const [
    documentCount,
    comparisonCount,
    findingsCount,
    chatSessionCount,
    recentDocumentsResult,
    recentComparisonsResult,
  ] = await Promise.all([
    countExact(supabase, "documents"),
    countExact(supabase, "comparisons"),
    countExact(supabase, "comparison_findings"),
    countExact(supabase, "chat_sessions"),
    supabase
      .from("documents")
      .select("id, title, purpose, status, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("comparisons")
      .select(
        "id, status, created_at, completed_at, document_a_id, document_b_id, summary"
      )
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  if (recentDocumentsResult.error) {
    console.error(
      "Failed to load recent documents",
      recentDocumentsResult.error
    );
  }
  if (recentComparisonsResult.error) {
    console.error(
      "Failed to load recent comparisons",
      recentComparisonsResult.error
    );
  }

  const recentDocuments =
    (recentDocumentsResult.data as Pick<
      DocumentRow,
      "id" | "title" | "purpose" | "status" | "created_at"
    >[]) ?? [];
  const recentComparisonRows =
    (recentComparisonsResult.data as ComparisonRow[]) ?? [];

  const documentIds = [
    ...new Set(
      recentComparisonRows.flatMap((c) => [c.document_a_id, c.document_b_id])
    ),
  ];
  const comparisonIds = recentComparisonRows.map((c) => c.id);

  const titlesById = new Map<string, string>();
  const findingsCountByComparisonId = new Map<string, number>();

  if (documentIds.length > 0 || comparisonIds.length > 0) {
    const [docsResult, findingsResult] = await Promise.all([
      documentIds.length > 0
        ? supabase.from("documents").select("id, title").in("id", documentIds)
        : Promise.resolve({
            data: [] as { id: string; title: string }[],
            error: null,
          }),
      comparisonIds.length > 0
        ? supabase
            .from("comparison_findings")
            .select("comparison_id")
            .in("comparison_id", comparisonIds)
        : Promise.resolve({
            data: [] as { comparison_id: string }[],
            error: null,
          }),
    ]);

    if (docsResult.error) {
      console.error(
        "Failed to load comparison document titles",
        docsResult.error
      );
    } else {
      for (const doc of docsResult.data ?? []) {
        titlesById.set(doc.id, doc.title);
      }
    }

    if (findingsResult.error) {
      console.error(
        "Failed to load findings counts for recent comparisons",
        findingsResult.error
      );
    } else {
      for (const row of findingsResult.data ?? []) {
        const prev = findingsCountByComparisonId.get(row.comparison_id) ?? 0;
        findingsCountByComparisonId.set(row.comparison_id, prev + 1);
      }
    }
  }

  const recentComparisons: RecentComparison[] = recentComparisonRows.map(
    (c) => ({
      ...c,
      document_a_title: titlesById.get(c.document_a_id) ?? "Unknown document",
      document_b_title: titlesById.get(c.document_b_id) ?? "Unknown document",
      findings_count: findingsCountByComparisonId.get(c.id) ?? 0,
    })
  );

  const hasAnyData =
    documentCount > 0 || comparisonCount > 0 || chatSessionCount > 0;

  return (
    <div className="min-h-0 w-full flex-1 overflow-y-auto">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 p-6 lg:px-10">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome back, Ridgeline Renovations
          </h1>
          <p className="text-muted-foreground max-w-2xl text-sm">
            AI-powered document intelligence — chat with your project files or
            compare vendor quotes in seconds.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/chat">Open Chat</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="border-clarion-coral text-clarion-coral hover:text-clarion-coral hover:bg-[color:var(--clarion-coral-tint)]"
          >
            <Link href="/compare">Compare Documents</Link>
          </Button>
        </div>

        {!hasAnyData ? (
          <p className="text-muted-foreground rounded-md border border-dashed px-4 py-8 text-center text-sm">
            No activity yet. Upload a document in Chat or start a comparison to
            see it here.
          </p>
        ) : (
          <>
            <section className="grid gap-4 sm:grid-cols-3">
              <StatCard
                icon={FileText}
                label="Documents"
                value={String(documentCount)}
              />
              <StatCard
                icon={Diff}
                label="Comparisons"
                value={String(comparisonCount)}
                helper={`${findingsCount} ${
                  findingsCount === 1 ? "difference" : "differences"
                } found`}
                tone="coral"
              />
              <StatCard
                icon={MessageSquare}
                label="Chat conversations"
                value={String(chatSessionCount)}
              />
            </section>

            <div className="grid gap-8 lg:grid-cols-2 lg:gap-6">
              <section className="space-y-3">
                <h2 className="text-sm font-medium">Recent documents</h2>
                {recentDocuments.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No documents uploaded yet.
                  </p>
                ) : (
                  <ul className="clarion-panel divide-y">
                    {recentDocuments.map((doc) => (
                      <li
                        key={doc.id}
                        className="flex items-start justify-between gap-3 px-3 py-3"
                      >
                        <div className="flex min-w-0 items-start gap-2.5">
                          <FileText className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                          <div className="min-w-0 space-y-1">
                            <p className="truncate text-sm font-medium">
                              {doc.title}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              {doc.purpose}
                            </p>
                          </div>
                        </div>
                        <Badge variant={documentStatusVariant[doc.status]}>
                          {doc.status}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="space-y-3">
                <h2 className="text-sm font-medium">Recent comparisons</h2>
                {recentComparisons.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No comparisons yet.
                  </p>
                ) : (
                  <ul className="clarion-panel divide-y">
                    {recentComparisons.map((c) => (
                      <li
                        key={c.id}
                        className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-start sm:justify-between"
                      >
                        <div className="flex min-w-0 items-start gap-2.5">
                          <Diff className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                          <div className="min-w-0 space-y-1">
                            <p className="truncate text-sm font-medium">
                              {c.document_a_title} vs {c.document_b_title}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              {new Date(c.created_at).toLocaleDateString(
                                "en-US"
                              )}{" "}
                              · {c.findings_count}{" "}
                              {c.findings_count === 1
                                ? "difference"
                                : "differences"}
                            </p>
                          </div>
                        </div>
                        <Badge variant="secondary">{c.status}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  helper,
  tone = "green",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  helper?: string;
  tone?: "green" | "coral";
}) {
  return (
    <div className="clarion-panel flex items-start gap-3 px-4 py-4">
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-md",
          tone === "coral"
            ? "text-clarion-coral bg-[color:var(--clarion-coral-tint)]"
            : "text-primary bg-[color:var(--clarion-green-tint)]"
        )}
      >
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 space-y-0.5">
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className="text-lg font-semibold tracking-tight">{value}</p>
        {helper ? (
          <p className="text-muted-foreground truncate text-xs">{helper}</p>
        ) : null}
      </div>
    </div>
  );
}
