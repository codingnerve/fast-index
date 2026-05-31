import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserId } from "@/lib/auth";
import { splitInput } from "@/lib/validate";
import { runIndexJob } from "@/lib/engine";

const schema = z.object({
  text: z.string().min(1, "Provide at least one URL"),
  engine: z.enum(["indexnow", "google", "both"]).default("indexnow"),
  source: z.enum(["paste", "csv", "api"]).default("paste"),
});

export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const lines = splitInput(parsed.data.text);
  if (lines.length === 0) {
    return NextResponse.json({ error: "No URLs found" }, { status: 400 });
  }

  const result = await runIndexJob({
    userId,
    rawLines: lines,
    engine: parsed.data.engine,
    source: parsed.data.source,
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        error: `Not enough credits: need ${result.need}, have ${result.have}.`,
        code: result.error,
      },
      { status: 402 }
    );
  }

  return NextResponse.json({ ok: true, jobId: result.jobId });
}
