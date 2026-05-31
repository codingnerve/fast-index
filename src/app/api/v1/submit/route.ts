import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateApiKey, rateLimit, extractKey } from "@/lib/apikey";
import { splitInput } from "@/lib/validate";
import { runIndexJob } from "@/lib/engine";

// Public, programmatic bulk-submit endpoint authenticated by API key.
//
//   curl -X POST https://yourdomain/api/v1/submit \
//     -H "Authorization: Bearer ifk_..." \
//     -H "Content-Type: application/json" \
//     -d '{"urls":["https://example.com/a","https://example.com/b"],"engine":"indexnow"}'
//
// Accepts either {"urls": [...]} or {"text": "newline-separated"}.
const schema = z.object({
  urls: z.array(z.string()).optional(),
  text: z.string().optional(),
  engine: z.enum(["indexnow", "google", "both"]).default("indexnow"),
});

export async function POST(req: Request) {
  const presented = extractKey(req);
  if (!presented) {
    return NextResponse.json(
      { error: "Missing API key (Authorization: Bearer <key>)" },
      { status: 401 }
    );
  }

  const auth = await authenticateApiKey(presented);
  if (!auth) {
    return NextResponse.json({ error: "Invalid or revoked API key" }, { status: 401 });
  }

  const limit = rateLimit(auth.keyId);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const lines = parsed.data.urls?.length
    ? parsed.data.urls
    : splitInput(parsed.data.text ?? "");
  if (lines.length === 0) {
    return NextResponse.json({ error: "No URLs provided" }, { status: 400 });
  }

  const result = await runIndexJob({
    userId: auth.userId,
    rawLines: lines,
    engine: parsed.data.engine,
    source: "api",
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: "Insufficient credits", need: result.need, have: result.have },
      { status: 402 }
    );
  }

  return NextResponse.json({ ok: true, jobId: result.jobId });
}
