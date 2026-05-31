"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type JobUrl = {
  id: string;
  url: string;
  status: string;
  message: string | null;
};
type Job = {
  id: string;
  total: number;
  submitted: number;
  failed: number;
  duplicates: number;
  invalid: number;
  creditsSpent: number;
  status: string;
  urls: JobUrl[];
};

const statusColor: Record<string, string> = {
  submitted: "text-green-600",
  indexed: "text-green-700",
  failed: "text-red-500",
  invalid: "text-amber-600",
  duplicate: "text-slate-400",
  pending: "text-slate-500",
};

export function SubmitForm({
  credits,
  freeMode = false,
}: {
  credits: number;
  freeMode?: boolean;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [engine, setEngine] = useState<"indexnow" | "google" | "both">("indexnow");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<Job | null>(null);

  const urlCount = text
    .split(/[\r\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean).length;

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const content = await file.text();
    setText((prev) => (prev ? prev + "\n" : "") + content);
  }

  async function submit() {
    setError(null);
    setJob(null);
    setLoading(true);
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, engine, source: "paste" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Submission failed");
        return;
      }
      const jobRes = await fetch(`/api/jobs/${data.jobId}`);
      const jobData = await jobRes.json();
      setJob(jobData.job);
      router.refresh(); // update credit balance + recent jobs
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-slate-900">Submit URLs</h2>
      <p className="mt-1 text-sm text-slate-600">
        Paste URLs (one per line) or upload a CSV. We validate and dedupe
        {freeMode ? " before submitting." : " before charging credits."}
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={8}
        placeholder={"https://example.com/page-1\nhttps://example.com/page-2"}
        className="mt-4 w-full rounded-lg border border-slate-300 p-3 font-mono text-sm"
      />

      <div className="mt-3 flex flex-wrap items-center gap-4">
        <label className="text-sm text-slate-600">
          CSV:{" "}
          <input
            type="file"
            accept=".csv,.txt"
            onChange={onFile}
            className="text-xs"
          />
        </label>

        <label className="text-sm text-slate-600">
          Engine:{" "}
          <select
            value={engine}
            onChange={(e) => setEngine(e.target.value as typeof engine)}
            className="rounded border border-slate-300 px-2 py-1 text-sm"
          >
            <option value="indexnow">IndexNow (Bing/Yandex)</option>
            <option value="google">Google (optional)</option>
            <option value="both">Both</option>
          </select>
        </label>

        <span className="text-sm text-slate-500">
          {urlCount} line{urlCount === 1 ? "" : "s"}
          {freeMode ? "" : ` · ${credits} credits available`}
        </span>

        <button
          onClick={submit}
          disabled={loading || urlCount === 0}
          className="ml-auto rounded-lg bg-brand-600 px-5 py-2 font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {loading ? "Submitting…" : "Validate & submit"}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {job && (
        <div className="mt-6 border-t border-slate-100 pt-4">
          <div className="flex flex-wrap gap-4 text-sm">
            <Stat label="Submitted" value={job.submitted} color="text-green-600" />
            <Stat label="Failed" value={job.failed} color="text-red-500" />
            <Stat label="Duplicates" value={job.duplicates} color="text-slate-400" />
            <Stat label="Invalid" value={job.invalid} color="text-amber-600" />
            {!freeMode && (
              <Stat label="Credits spent" value={job.creditsSpent} color="text-slate-700" />
            )}
          </div>

          <div className="mt-4 max-h-72 overflow-auto rounded-lg border border-slate-100">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-3 py-2">URL</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Message</th>
                </tr>
              </thead>
              <tbody>
                {job.urls.map((u) => (
                  <tr key={u.id} className="border-t border-slate-100">
                    <td className="max-w-xs truncate px-3 py-1.5 font-mono">
                      {u.url}
                    </td>
                    <td
                      className={`px-3 py-1.5 font-medium ${
                        statusColor[u.status] ?? "text-slate-500"
                      }`}
                    >
                      {u.status}
                    </td>
                    <td className="px-3 py-1.5 text-slate-500">{u.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-lg bg-slate-50 px-4 py-2">
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}
