// Pricing plans (₹). Single source of truth shared by the pricing page and
// the Razorpay order route.

export type Plan = {
  id: "starter" | "professional" | "enterprise";
  name: string;
  rupees: number;
  credits: number;
  support: string;
  badge?: string;
};

export const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    rupees: 2000,
    credits: 500,
    support: "Email support",
  },
  {
    id: "professional",
    name: "Professional",
    rupees: 10000,
    credits: 2500,
    support: "Priority support",
    badge: "Best value",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    rupees: 40000,
    credits: 10000,
    support: "Dedicated support",
  },
];

export function getPlan(id: string): Plan | undefined {
  return PLANS.find((p) => p.id === id);
}
