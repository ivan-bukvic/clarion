export default function CompareLoading() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 overflow-y-auto p-6">
      <div className="space-y-2">
        <div className="h-6 w-28 animate-pulse rounded bg-muted" />
        <div className="h-4 w-72 animate-pulse rounded bg-muted" />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="h-48 animate-pulse rounded-md border bg-muted/40" />
        <div className="h-48 animate-pulse rounded-md border bg-muted/40" />
      </div>
      <div className="h-9 w-40 animate-pulse rounded-md bg-muted" />
    </main>
  );
}
