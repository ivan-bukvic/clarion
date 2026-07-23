/**
 * Hook called when a comparison reaches status = 'completed'.
 * Full DOCX report generation is Faza 4 — this stub only logs so the
 * call site is already wired for the next phase (Faza 3 checklist #8).
 */
export function triggerReportGeneration(comparisonId: string): void {
  console.log("DOCX generation not yet implemented — Faza 4", {
    comparison_id: comparisonId,
  });
}
