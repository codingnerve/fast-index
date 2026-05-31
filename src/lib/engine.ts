// Job orchestrator: ties validation → credit reservation → submission →
// status persistence together. Used by the /api/submit route.

import { prisma } from "./db";
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

  // 1. Validate / dedup / normalize before touching credits.
  const parsed = parseUrlList(rawLines);
  const toSubmit = parsed.valid;

  // 2. Check credit balance — we charge 1 credit per URL we attempt to submit.
  // Skipped entirely in free mode.
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  if (!FREE_MODE && user.credits < toSubmit.length) {
    return {
      ok: false as const,
      error: "INSUFFICIENT_CREDITS",
      need: toSubmit.length,
      have: user.credits,
    };
  }

  // 3. Create the job record.
  const job = await prisma.indexJob.create({
    data: {
      userId,
      source,
      engine,
      total: rawLines.length,
      duplicates: parsed.duplicates.length,
      invalid: parsed.invalid.length,
      status: "processing",
    },
  });

  // Record invalid + duplicate rows for transparency in the UI.
  if (parsed.invalid.length || parsed.duplicates.length) {
    await prisma.indexUrl.createMany({
      data: [
        ...parsed.invalid.map((i) => ({
          jobId: job.id,
          url: i.raw,
          status: "invalid",
          engine,
          message: i.reason,
        })),
        ...parsed.duplicates.map((u) => ({
          jobId: job.id,
          url: u,
          status: "duplicate",
          engine,
          message: "Duplicate in submission",
        })),
      ],
    });
  }

  if (toSubmit.length === 0) {
    await prisma.indexJob.update({
      where: { id: job.id },
      data: { status: "done" },
    });
    return { ok: true as const, jobId: job.id };
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
  for (const url of toSubmit) {
    const r = resultsByUrl.get(url);
    const ok = r?.ok ?? false;
    if (ok) submitted++;
    else failed++;
    await prisma.indexUrl.create({
      data: {
        jobId: job.id,
        url,
        status: ok ? "submitted" : "failed",
        engine,
        message: r?.message ?? "No response",
      },
    });
  }

  // 6. Charge credits only for URLs we successfully submitted. In free mode we
  // record the job tally but never touch the user's credit balance.
  const creditsSpent = FREE_MODE ? 0 : submitted;
  await prisma.$transaction([
    ...(FREE_MODE
      ? []
      : [
          prisma.user.update({
            where: { id: userId },
            data: { credits: { decrement: creditsSpent } },
          }),
          prisma.creditTransaction.create({
            data: { userId, amount: -creditsSpent, reason: "indexing" },
          }),
        ]),
    prisma.indexJob.update({
      where: { id: job.id },
      data: { submitted, failed, creditsSpent, status: "done" },
    }),
  ]);

  return { ok: true as const, jobId: job.id };
}
