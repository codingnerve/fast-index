import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { FREE_MODE } from "@/lib/config";
import { SubmitForm } from "./SubmitForm";
import { ApiKeys } from "./ApiKeys";
import { IndexChecker } from "./IndexChecker";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const jobs = await prisma.indexJob.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const engineConfigured = {
    indexnow: !!process.env.INDEXNOW_KEY,
    google: !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON,
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-600">
            Welcome{user.name ? `, ${user.name}` : ""}
            {FREE_MODE ? (
              <> — submit as many URLs as you like, free.</>
            ) : (
              <>
                {" "}
                — you have <strong>{user.credits}</strong> credits.
              </>
            )}
          </p>
        </div>
      </div>

      {(!engineConfigured.indexnow || !engineConfigured.google) && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          {!engineConfigured.indexnow && (
            <p>
              ⚠️ <code>INDEXNOW_KEY</code> not set — IndexNow runs in{" "}
              <strong>simulation mode</strong> (no real submission). Add it in{" "}
              <code>.env</code> to go live.
            </p>
          )}
          {!engineConfigured.google && (
            <p>
              ℹ️ Google Indexing API disabled (no service account). It is
              optional and officially supports only job/livestream pages.
            </p>
          )}
        </div>
      )}

      <SubmitForm credits={user.credits} freeMode={FREE_MODE} />

      <IndexChecker configured={engineConfigured.google} />

      <ApiKeys />

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Recent jobs</h2>
        {jobs.length === 0 ? (
          <p className="text-sm text-slate-500">No jobs yet. Submit some URLs above.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Engine</th>
                  <th className="px-4 py-2">Total</th>
                  <th className="px-4 py-2">Submitted</th>
                  <th className="px-4 py-2">Failed</th>
                  <th className="px-4 py-2">Dupes/Invalid</th>
                  {!FREE_MODE && <th className="px-4 py-2">Credits</th>}
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => (
                  <tr key={j.id} className="border-t border-slate-100">
                    <td className="px-4 py-2 text-slate-600">
                      {j.createdAt.toLocaleString()}
                    </td>
                    <td className="px-4 py-2">{j.engine}</td>
                    <td className="px-4 py-2">{j.total}</td>
                    <td className="px-4 py-2 text-green-600">{j.submitted}</td>
                    <td className="px-4 py-2 text-red-500">{j.failed}</td>
                    <td className="px-4 py-2 text-slate-500">
                      {j.duplicates}/{j.invalid}
                    </td>
                    {!FREE_MODE && <td className="px-4 py-2">{j.creditsSpent}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
