import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/guard";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { runComparison } from "@/lib/compare/run";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z
  .object({
    document_a_id: z.string().uuid(),
    document_b_id: z.string().uuid(),
  })
  .refine((data) => data.document_a_id !== data.document_b_id, {
    message: "document_a_id and document_b_id must be different.",
  });

type CompareErrorCode = "COMPARISON_GENERATION_FAILED";

function errorResponse(
  code: CompareErrorCode,
  message: string,
  status: number
) {
  return NextResponse.json({ code, message }, { status });
}

export async function POST(request: Request) {
  const { unauthorized } = await requireSession();
  if (unauthorized) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        message:
          "document_a_id and document_b_id are required UUIDs and must differ.",
      },
      { status: 400 }
    );
  }

  const { document_a_id, document_b_id } = parsed.data;
  const supabase = createServiceRoleClient();

  try {
    const { data: docs, error: docsError } = await supabase
      .from("documents")
      .select("id, title, purpose, status")
      .in("id", [document_a_id, document_b_id]);

    if (docsError) {
      console.error("COMPARISON_GENERATION_FAILED", docsError);
      return errorResponse(
        "COMPARISON_GENERATION_FAILED",
        "Could not load the selected documents. Please try again.",
        500
      );
    }

    const docA = docs?.find((d) => d.id === document_a_id);
    const docB = docs?.find((d) => d.id === document_b_id);

    if (!docA || !docB) {
      return NextResponse.json(
        { message: "One or both documents were not found." },
        { status: 400 }
      );
    }

    if (docA.purpose !== "comparison" || docB.purpose !== "comparison") {
      return NextResponse.json(
        {
          message: "Both documents must have purpose = comparison.",
        },
        { status: 400 }
      );
    }

    if (docA.status !== "ready" || docB.status !== "ready") {
      return NextResponse.json(
        {
          message:
            "Both documents must be ready before starting a comparison.",
        },
        { status: 400 }
      );
    }

    const result = await runComparison(
      supabase,
      { id: docA.id, title: docA.title },
      { id: docB.id, title: docB.title }
    );

    if (!result.ok) {
      return NextResponse.json(
        {
          code: "COMPARISON_GENERATION_FAILED" satisfies CompareErrorCode,
          message: result.message,
          ...(result.comparison
            ? { comparison: result.comparison, findings: result.findings }
            : {}),
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      comparison: result.comparison,
      findings: result.findings,
    });
  } catch (err) {
    console.error("COMPARISON_UNEXPECTED", err);
    return errorResponse(
      "COMPARISON_GENERATION_FAILED",
      "Comparison failed unexpectedly. Please try again.",
      500
    );
  }
}
