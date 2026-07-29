export default function ChatLoading() {
  return (
    <div className="min-h-0 w-full flex-1 overflow-y-auto">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6 md:flex-row">
        <section className="flex max-h-64 w-full flex-col gap-4 md:max-h-none md:max-w-sm md:shrink-0">
          <div className="space-y-2">
            <div className="bg-muted h-6 w-28 animate-pulse rounded" />
            <div className="bg-muted h-4 w-48 animate-pulse rounded" />
          </div>
          <div className="bg-muted/40 h-40 animate-pulse rounded-md border" />
          <div className="space-y-3">
            <div className="bg-muted h-4 w-24 animate-pulse rounded" />
            <div className="bg-muted/40 h-24 animate-pulse rounded-md border" />
          </div>
        </section>
        <section className="bg-muted/30 flex min-h-0 flex-1 animate-pulse rounded-lg border" />
      </main>
    </div>
  );
}
