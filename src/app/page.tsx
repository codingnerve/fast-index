import Link from "next/link";

const steps = [
  {
    title: "1. Upload",
    body: "Paste URLs, drop a CSV, or call the API. No row limits.",
  },
  {
    title: "2. Validate",
    body: "We dedupe, normalize protocols, trim whitespace and drop invalid URLs — before any credit is spent.",
  },
  {
    title: "3. Submit & track",
    body: "URLs go to IndexNow (Bing, Yandex, Seznam, Naver) and optionally Google, with live per-URL status.",
  },
];

const features = [
  ["Bulk processing", "Submit thousands of URLs at once, grouped by host automatically."],
  ["Pay per success", "Credits are only charged for URLs we successfully submit."],
  ["Credits never expire", "No subscriptions, no monthly minimums. Top up anytime."],
  ["Honest reporting", "We show submitted vs. failed — and never fake an 'indexed' guarantee."],
];

export default function Home() {
  return (
    <div className="space-y-16">
      <section className="py-12 text-center">
        <span className="inline-block rounded-full bg-brand-50 px-4 py-1 text-sm font-medium text-brand-700">
          Bulk URL indexing for SEO teams
        </span>
        <h1 className="mx-auto mt-4 max-w-3xl text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
          Get your URLs in front of search engines — fast.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
          Submit pages and backlinks in bulk to IndexNow and Google. Validate,
          de-duplicate, and track every URL's status from one dashboard.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/signup"
            className="rounded-lg bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700"
          >
            Start free — 10 credits
          </Link>
          <Link
            href="/pricing"
            className="rounded-lg border border-slate-300 px-6 py-3 font-semibold text-slate-700 hover:bg-white"
          >
            See pricing
          </Link>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        {steps.map((s) => (
          <div
            key={s.title}
            className="rounded-2xl border border-slate-200 bg-white p-6"
          >
            <h3 className="font-bold text-slate-900">{s.title}</h3>
            <p className="mt-2 text-sm text-slate-600">{s.body}</p>
          </div>
        ))}
      </section>

      <section>
        <h2 className="text-center text-2xl font-bold text-slate-900">
          Why IndexFast
        </h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {features.map(([title, body]) => (
            <div key={title} className="flex gap-4">
              <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-600" />
              <div>
                <h3 className="font-semibold text-slate-900">{title}</h3>
                <p className="text-sm text-slate-600">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        <strong>A note on honesty:</strong> IndexNow (Bing, Yandex, Seznam,
        Naver) is a sanctioned protocol and works reliably. Google does{" "}
        <em>not</em> guarantee indexing for any submitted URL — no tool can. We
        report what we actually submitted, not a fake success rate.
      </section>
    </div>
  );
}
