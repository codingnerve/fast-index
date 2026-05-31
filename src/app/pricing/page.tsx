import { PLANS } from "@/lib/plans";
import { getCurrentUser } from "@/lib/auth";
import { BuyButton } from "./BuyButton";

export default async function PricingPage() {
  const user = await getCurrentUser();
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-900">Simple credit pricing</h1>
        <p className="mt-2 text-slate-600">
          1 credit = 1 successfully submitted URL. Credits never expire.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`relative rounded-2xl border bg-white p-6 ${
              plan.badge ? "border-brand-600 shadow-lg" : "border-slate-200"
            }`}
          >
            {plan.badge && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white">
                {plan.badge}
              </span>
            )}
            <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
            <p className="mt-2 text-3xl font-extrabold text-slate-900">
              ₹{plan.rupees.toLocaleString("en-IN")}
            </p>
            <p className="text-sm text-slate-500">
              {plan.credits.toLocaleString("en-IN")} credits · ₹
              {(plan.rupees / plan.credits).toFixed(2)} / URL
            </p>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              <li>✓ Instant IndexNow submission</li>
              <li>✓ {plan.support}</li>
              <li>✓ Credits never expire</li>
            </ul>
            <div className="mt-6">
              <BuyButton plan={plan.id} loggedIn={!!user} />
            </div>
          </div>
        ))}
      </div>

      <p className="text-center text-sm text-slate-500">
        Need more than 10,000 URLs?{" "}
        <a href="mailto:sales@example.com" className="text-brand-600 underline">
          Contact us
        </a>{" "}
        for custom bulk pricing.
      </p>
    </div>
  );
}
