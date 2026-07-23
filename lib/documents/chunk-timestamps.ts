/**
 * Explicit, strictly-increasing created_at values for a multi-row
 * document_chunks INSERT. Postgres evaluates now() once per statement, so
 * every chunk would otherwise get an identical timestamp and
 * .order("created_at") couldn't reconstruct document order — which matters
 * because lib/compare/full-content.ts depends on chunk order to rebuild
 * full documents for comparison (same fix already applied to chat_messages).
 *
 * Shared by the production upload route and scripts/lib/ingest-fixture.ts
 * so the two insert paths cannot drift.
 */
export function chunkCreatedAtTimestamps(count: number): string[] {
  const base = Date.now();
  return Array.from({ length: count }, (_, i) =>
    new Date(base + i).toISOString()
  );
}
