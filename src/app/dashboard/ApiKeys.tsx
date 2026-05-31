"use client";

import { useEffect, useState } from "react";

type Key = {
  id: string;
  label: string;
  prefix: string;
  revoked: boolean;
  requests: number;
  lastUsedAt: string | null;
  createdAt: string;
};

export function ApiKeys() {
  const [keys, setKeys] = useState<Key[]>([]);
  const [label, setLabel] = useState("");
  const [created, setCreated] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    const res = await fetch("/api/keys");
    if (res.ok) setKeys((await res.json()).keys);
  }
  useEffect(() => {
    load();
  }, []);

  async function create() {
    setLoading(true);
    setCreated(null);
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label || "Default" }),
      });
      const data = await res.json();
      if (res.ok) {
        setCreated(data.key);
        setLabel("");
        load();
      }
    } finally {
      setLoading(false);
    }
  }

  async function revoke(id: string) {
    await fetch(`/api/keys/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-slate-900">API keys</h2>
      <p className="mt-1 text-sm text-slate-600">
        Submit URLs programmatically. Send the key as{" "}
        <code className="rounded bg-slate-100 px-1">Authorization: Bearer &lt;key&gt;</code>{" "}
        to <code className="rounded bg-slate-100 px-1">/api/v1/submit</code>.
      </p>

      <div className="mt-4 flex gap-2">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Key label (e.g. production)"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          onClick={create}
          disabled={loading}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {loading ? "Creating…" : "Create key"}
        </button>
      </div>

      {created && (
        <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-3">
          <p className="text-xs font-medium text-green-800">
            Copy this key now — it won't be shown again:
          </p>
          <code className="mt-1 block break-all rounded bg-white px-2 py-1 text-xs">
            {created}
          </code>
        </div>
      )}

      {keys.length > 0 && (
        <table className="mt-4 w-full text-sm">
          <thead className="text-left text-xs text-slate-500">
            <tr>
              <th className="py-1">Label</th>
              <th className="py-1">Key</th>
              <th className="py-1">Requests</th>
              <th className="py-1">Status</th>
              <th className="py-1"></th>
            </tr>
          </thead>
          <tbody>
            {keys.map((k) => (
              <tr key={k.id} className="border-t border-slate-100">
                <td className="py-2">{k.label}</td>
                <td className="py-2 font-mono text-xs text-slate-500">
                  {k.prefix}…
                </td>
                <td className="py-2">{k.requests}</td>
                <td className="py-2">
                  {k.revoked ? (
                    <span className="text-red-500">revoked</span>
                  ) : (
                    <span className="text-green-600">active</span>
                  )}
                </td>
                <td className="py-2 text-right">
                  {!k.revoked && (
                    <button
                      onClick={() => revoke(k.id)}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Revoke
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
