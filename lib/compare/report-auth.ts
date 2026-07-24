import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/guard";

const paramsSchema = z.object({
  id: z.string().uuid(),
});

export type ReportRouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * Shared session + params gate for report download, regenerate, and status.
 * Returns either an early NextResponse or the validated comparison_id.
 */
export async function authorizeReportRequest(
  context: ReportRouteContext
): Promise<
  | { ok: true; comparisonId: string }
  | { ok: false; response: NextResponse }
> {
  const { unauthorized } = await requireSession();
  if (unauthorized) {
    return {
      ok: false,
      response: NextResponse.json({ message: "Unauthorized" }, { status: 401 }),
    };
  }

  const parsedParams = paramsSchema.safeParse(await context.params);
  if (!parsedParams.success) {
    return {
      ok: false,
      response: NextResponse.json(
        { message: "comparison id must be a valid UUID." },
        { status: 400 }
      ),
    };
  }

  return { ok: true, comparisonId: parsedParams.data.id };
}
