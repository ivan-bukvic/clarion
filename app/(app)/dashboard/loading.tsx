export default function DashboardLoading() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 overflow-y-auto p-6">
      <div className="space-y-2">
        <div className="h-7 w-80 animate-pulse rounded bg-muted" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded bg-muted" />
      </div>
      <div className="flex gap-3">
        <div className="h-9 w-28 animate-pulse rounded-md bg-muted" />
        <div className="h-9 w-40 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="h-16 animate-pulse rounded-md border bg-muted/40" />
        <div className="h-16 animate-pulse rounded-md border bg-muted/40" />
        <div className="h-16 animate-pulse rounded-md border bg-muted/40" />
      </div>
      <div className="h-40 animate-pulse rounded-md border bg-muted/30" />
      <div className="h-40 animate-pulse rounded-md border bg-muted/30" />
    </main>
  );
}
