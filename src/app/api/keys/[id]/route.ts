import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { ApiKey, isValidId } from "@/lib/models";
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
  if (!isValidId(params.id)) {
    return NextResponse.json({ error: "Key not found" }, { status: 404 });
  }
  await dbConnect();
  const result = await ApiKey.updateOne(
    { _id: params.id, userId },
    { $set: { revoked: true } }
  );
  if (result.matchedCount === 0) {
    return NextResponse.json({ error: "Key not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
