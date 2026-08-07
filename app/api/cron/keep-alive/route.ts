import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Vercel Cron target (see vercel.json) — pings Supabase daily so the
 * free-plan project is never idle for the 7 days that trigger auto-pause.
 * Read-only; no data is modified. Auth is CRON_SECRET only (proxy.ts
 * exempts /api/cron/* from Basic-Auth and session checks) — Vercel sends
 * "Authorization: Bearer <CRON_SECRET>" automatically when the env var is
 * set on the project.
 */
export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!expected || authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServiceRoleClient();
    const { error } = await supabase.from("documents").select("id").limit(1);

    if (error) {
      console.error("CRON_KEEP_ALIVE_FAILED", error);
      return NextResponse.json(
        { ok: false, message: "Keep-alive query failed." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("CRON_KEEP_ALIVE_FAILED", err);
    return NextResponse.json(
      { ok: false, message: "Keep-alive failed unexpectedly." },
      { status: 500 }
    );
  }
}
