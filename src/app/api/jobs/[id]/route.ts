import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { IndexJob, IndexUrl, isValidId } from "@/lib/models";
import { getUserId } from "@/lib/auth";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!isValidId(params.id)) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  await dbConnect();
  const job = await IndexJob.findOne({ _id: params.id, userId });
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  // No relational joins in MongoDB — fetch the job's URLs separately.
  const urls = await IndexUrl.find({ jobId: params.id }).sort({ createdAt: 1 });

  return NextResponse.json({ job: { ...job.toJSON(), urls } });
}
