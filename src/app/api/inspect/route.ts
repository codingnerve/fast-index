import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserId } from "@/lib/auth";
import { inspectUrl } from "@/lib/gsc";

const schema = z.object({
  url: z.string().url(),
  siteUrl: z.string().min(1), // e.g. "sc-domain:example.com" or "https://example.com/"
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
      { error: "Provide a valid url and siteUrl" },
      { status: 400 }
    );
  }

  const result = await inspectUrl(parsed.data.url, parsed.data.siteUrl);
  return NextResponse.json({ result });
}
