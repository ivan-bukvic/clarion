export default function ChatLoading() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 overflow-hidden p-6 md:flex-row">
      <section className="flex max-h-64 w-full flex-col gap-4 md:max-h-none md:max-w-sm md:shrink-0">
        <div className="space-y-2">
          <div className="h-6 w-28 animate-pulse rounded bg-muted" />
          <div className="h-4 w-48 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-40 animate-pulse rounded-md border bg-muted/40" />
        <div className="space-y-3">
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          <div className="h-24 animate-pulse rounded-md border bg-muted/40" />
        </div>
      </section>
      <section className="flex min-h-0 flex-1 animate-pulse rounded-lg border bg-muted/30" />
    </main>
  );
}
