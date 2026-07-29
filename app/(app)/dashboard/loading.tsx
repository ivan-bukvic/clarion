export default function DashboardLoading() {
  return (
    <div className="min-h-0 w-full flex-1 overflow-y-auto">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 p-6">
        <div className="space-y-2">
          <div className="bg-muted h-7 w-80 animate-pulse rounded" />
          <div className="bg-muted h-4 w-96 max-w-full animate-pulse rounded" />
        </div>
        <div className="flex gap-3">
          <div className="bg-muted h-9 w-28 animate-pulse rounded-md" />
          <div className="bg-muted h-9 w-40 animate-pulse rounded-md" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="bg-muted/40 h-16 animate-pulse rounded-md border" />
          <div className="bg-muted/40 h-16 animate-pulse rounded-md border" />
          <div className="bg-muted/40 h-16 animate-pulse rounded-md border" />
        </div>
        <div className="bg-muted/30 h-40 animate-pulse rounded-md border" />
        <div className="bg-muted/30 h-40 animate-pulse rounded-md border" />
      </main>
    </div>
  );
}
