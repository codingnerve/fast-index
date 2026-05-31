import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/auth";

// Revoke an API key.
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const key = await prisma.apiKey.findFirst({
    where: { id: params.id, userId },
  });
  if (!key) {
    return NextResponse.json({ error: "Key not found" }, { status: 404 });
  }
  await prisma.apiKey.update({
    where: { id: key.id },
    data: { revoked: true },
  });
  return NextResponse.json({ ok: true });
}
