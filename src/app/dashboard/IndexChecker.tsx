"use client";

import { useState } from "react";

type Result = {
  url: string;
  ok: boolean;
  verdict?: string;
  coverageState?: string;
  lastCrawlTime?: string;
  robotsTxtState?: string;
  message?: string;
};

export function IndexChecker({ configured }: { configured: boolean }) {
  const [url, setUrl] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);

  async function check() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/inspect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, siteUrl }),
      });
      const data = await res.json();
      setResult(res.ok ? data.result : { url, ok: false, message: data.error });
    } finally {
      setLoading(false);
    }
  }

  const indexed = result?.coverageState?.toLowerCase().includes("indexed");

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-slate-900">
        Is it indexed on Google?
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Checks the real index status via Google Search Console's URL Inspection
        API. Requires a verified property + service-account access.
      </p>

      {!configured && (
        <p className="mt-2 rounded bg-amber-50 px-3 py-2 text-xs text-amber-800">
          ⚠️ Not configured — set <code>GOOGLE_SERVICE_ACCOUNT_JSON</code> and grant
          the service account access to your GSC property.
        </p>
      )}

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/page"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          value={siteUrl}
          onChange={(e) => setSiteUrl(e.target.value)}
          placeholder="sc-domain:example.com"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <button
        onClick={check}
        disabled={loading || !url || !siteUrl}
        className="mt-3 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {loading ? "Checking…" : "Check index status"}
      </button>

      {result && (
        <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50 p-4 text-sm">
          {result.ok ? (
            <>
              <p>
                <span
                  className={`font-semibold ${
                    indexed ? "text-green-600" : "text-amber-600"
                  }`}
                >
                  {result.coverageState ?? result.verdict ?? "Unknown"}
                </span>
              </p>
              <dl className="mt-2 grid grid-cols-2 gap-1 text-xs text-slate-600">
                <dt>Verdict</dt>
                <dd>{result.verdict ?? "—"}</dd>
                <dt>Robots.txt</dt>
                <dd>{result.robotsTxtState ?? "—"}</dd>
                <dt>Last crawl</dt>
                <dd>{result.lastCrawlTime ?? "—"}</dd>
              </dl>
            </>
          ) : (
            <p className="text-red-600">{result.message}</p>
          )}
        </div>
      )}
    </section>
  );
}
