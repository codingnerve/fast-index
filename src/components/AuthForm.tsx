"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {mode === "signup" && (
        <div>
          <label className="block text-sm font-medium text-slate-700">Name</label>
          <input
            name="name"
            type="text"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            placeholder="Jane Doe"
          />
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-slate-700">Email</label>
        <input
          name="email"
          type="email"
          required
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          placeholder="you@company.com"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Password</label>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          placeholder="At least 8 characters"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {loading ? "Please wait…" : mode === "signup" ? "Create account" : "Log in"}
      </button>

      <p className="text-center text-sm text-slate-500">
        {mode === "signup" ? (
          <>
            Already have an account?{" "}
            <Link href="/login" className="text-brand-600 underline">
              Log in
            </Link>
          </>
        ) : (
          <>
            No account?{" "}
            <Link href="/signup" className="text-brand-600 underline">
              Sign up
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
