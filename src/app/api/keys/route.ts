import { NextResponse } from "next/server";
import { z } from "zod";
import { dbConnect } from "@/lib/db";
import { ApiKey } from "@/lib/models";
import { getUserId } from "@/lib/auth";
import { generateApiKey } from "@/lib/apikey";

// List the current user's API keys (never returns the secret).
export async function GET() {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  await dbConnect();
  const keys = await ApiKey.find({ userId })
    .sort({ createdAt: -1 })
    .select("label prefix revoked requests lastUsedAt createdAt");
  return NextResponse.json({ keys });
}

const createSchema = z.object({ label: z.string().min(1).max(40).default("Default") });

// Create a new API key. The plaintext key is returned ONCE.
export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body ?? {});
  const label = parsed.success ? parsed.data.label : "Default";

  const { full, hash, prefix } = generateApiKey();
  await dbConnect();
  await ApiKey.create({ userId, label, hash, prefix });

  return NextResponse.json({ key: full, prefix, label });
}
