// Job orchestrator: ties validation → credit reservation → submission →
// status persistence together. Used by the /api/submit route.

import { dbConnect } from "./db";
import { User, IndexJob, IndexUrl, CreditTransaction, isValidId } from "./models";
import { parseUrlList } from "./validate";
import { submitToIndexNow, type SubmitResult } from "./indexnow";
import { submitToGoogle } from "./google";
import { FREE_MODE } from "./config";

export type Engine = "indexnow" | "google" | "both";

export async function runIndexJob(params: {
  userId: string;
  rawLines: string[];
  engine: Engine;
  source: string;
}) {
  const { userId, rawLines, engine, source } = params;

  await dbConnect();

  // 1. Validate / dedup / normalize before touching credits.
  const parsed = parseUrlList(rawLines);
  const toSubmit = parsed.valid;

  // 2. Check credit balance — we charge 1 credit per URL we attempt to submit.
  // Skipped entirely in free mode.
  const user = isValidId(userId) ? await User.findById(userId) : null;
  if (!user) throw new Error("User not found");

  if (!FREE_MODE && user.credits < toSubmit.length) {
    return {
      ok: false as const,
      error: "INSUFFICIENT_CREDITS",
      need: toSubmit.length,
      have: user.credits as number,
    };
  }

  // 3. Create the job record.
  const job = await IndexJob.create({
    userId,
    source,
    engine,
    total: rawLines.length,
    duplicates: parsed.duplicates.length,
    invalid: parsed.invalid.length,
    status: "processing",
  });
  const jobId = String(job._id);

  // Record invalid + duplicate rows for transparency in the UI.
  if (parsed.invalid.length || parsed.duplicates.length) {
    await IndexUrl.insertMany([
      ...parsed.invalid.map((i) => ({
        jobId,
        url: i.raw,
        status: "invalid",
        engine,
        message: i.reason,
      })),
      ...parsed.duplicates.map((u) => ({
        jobId,
        url: u,
        status: "duplicate",
        engine,
        message: "Duplicate in submission",
      })),
    ]);
  }

  if (toSubmit.length === 0) {
    await IndexJob.updateOne({ _id: job._id }, { $set: { status: "done" } });
    return { ok: true as const, jobId };
  }

  // 4. Submit to the chosen engine(s).
  const resultsByUrl = new Map<string, SubmitResult>();
  const merge = (rs: SubmitResult[]) => {
    for (const r of rs) {
      const existing = resultsByUrl.get(r.url);
      // If submitted to multiple engines, a single success counts as success.
      if (!existing || (!existing.ok && r.ok)) resultsByUrl.set(r.url, r);
    }
  };

  if (engine === "indexnow" || engine === "both") {
    merge(await submitToIndexNow(toSubmit));
  }
  if (engine === "google" || engine === "both") {
    merge(await submitToGoogle(toSubmit));
  }

  // 5. Persist per-URL results and tally.
  let submitted = 0;
  let failed = 0;
  const urlDocs = toSubmit.map((url) => {
    const r = resultsByUrl.get(url);
    const ok = r?.ok ?? false;
    if (ok) submitted++;
    else failed++;
    return {
      jobId,
      url,
      status: ok ? "submitted" : "failed",
      engine,
      message: r?.message ?? "No response",
    };
  });
  await IndexUrl.insertMany(urlDocs);

  // 6. Charge credits only for URLs we successfully submitted. In free mode we
  // record the job tally but never touch the user's credit balance.
  const creditsSpent = FREE_MODE ? 0 : submitted;
  if (!FREE_MODE && creditsSpent > 0) {
    await User.updateOne({ _id: userId }, { $inc: { credits: -creditsSpent } });
    await CreditTransaction.create({ userId, amount: -creditsSpent, reason: "indexing" });
  }
  await IndexJob.updateOne(
    { _id: jobId },
    { $set: { submitted, failed, creditsSpent, status: "done" } }
  );

  return { ok: true as const, jobId };
}
