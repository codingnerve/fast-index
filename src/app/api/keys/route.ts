import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { generateApiKey } from "@/lib/apikey";

// List the current user's API keys (never returns the secret).
export async function GET() {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const keys = await prisma.apiKey.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      label: true,
      prefix: true,
      revoked: true,
      requests: true,
      lastUsedAt: true,
      createdAt: true,
    },
  });
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
  await prisma.apiKey.create({ data: { userId, label, hash, prefix } });

  return NextResponse.json({ key: full, prefix, label });
}
