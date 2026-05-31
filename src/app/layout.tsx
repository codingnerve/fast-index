import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { getCurrentUser } from "@/lib/auth";
import { FREE_MODE } from "@/lib/config";

export const metadata: Metadata = {
  title: "IndexFast — Bulk URL Indexing Tool",
  description:
    "Submit pages and backlinks to IndexNow (Bing, Yandex) and Google in bulk. Validate, dedup, and track indexing status.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  return (
    <html lang="en">
      <body>
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-lg font-bold text-brand-600">
              ⚡ IndexFast
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              {!FREE_MODE && (
                <Link href="/pricing" className="text-slate-600 hover:text-slate-900">
                  Pricing
                </Link>
              )}
              {user ? (
                <>
                  {!FREE_MODE && (
                    <span className="rounded-full bg-brand-50 px-3 py-1 font-medium text-brand-700">
                      {user.credits} credits
                    </span>
                  )}
                  <Link
                    href="/dashboard"
                    className="text-slate-600 hover:text-slate-900"
                  >
                    Dashboard
                  </Link>
                  <form action="/api/auth/logout" method="post">
                    <button
                      className="text-slate-500 hover:text-slate-900"
                      type="submit"
                    >
                      Log out
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <Link href="/login" className="text-slate-600 hover:text-slate-900">
                    Log in
                  </Link>
                  <Link
                    href="/signup"
                    className="rounded-lg bg-brand-600 px-3 py-1.5 font-medium text-white hover:bg-brand-700"
                  >
                    Get started
                  </Link>
                </>
              )}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400">
          IndexFast · Built with Next.js · IndexNow is sanctioned; Google indexing
          is never guaranteed.
        </footer>
      </body>
    </html>
  );
}
