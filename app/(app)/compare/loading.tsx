export default function CompareLoading() {
  return (
    <div className="min-h-0 w-full flex-1 overflow-y-auto">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
        <div className="space-y-2">
          <div className="bg-muted h-6 w-28 animate-pulse rounded" />
          <div className="bg-muted h-4 w-72 animate-pulse rounded" />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="bg-muted/40 h-48 animate-pulse rounded-md border" />
          <div className="bg-muted/40 h-48 animate-pulse rounded-md border" />
        </div>
        <div className="bg-muted h-9 w-40 animate-pulse rounded-md" />
      </main>
    </div>
  );
}
