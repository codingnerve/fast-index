"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function BuyButton({
  plan,
  loggedIn,
}: {
  plan: string;
  loggedIn: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function buy() {
    if (!loggedIn) {
      router.push("/signup");
      return;
    }
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/payments/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error ?? "Could not start checkout");
        return;
      }

      // Dev mode: keys not configured, credits granted instantly.
      if (data.devGranted) {
        setMsg(`✓ ${data.credits} credits added (dev mode).`);
        router.refresh();
        return;
      }

      const ok = await loadRazorpay();
      if (!ok || !window.Razorpay) {
        setMsg("Failed to load payment gateway");
        return;
      }

      const rzp = new window.Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        order_id: data.orderId,
        name: "IndexFast",
        description: `${plan} plan`,
        handler: () => {
          setMsg("Payment received — credits will appear shortly.");
          router.refresh();
        },
      });
      rzp.open();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={buy}
        disabled={loading}
        className="w-full rounded-lg bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {loading ? "Starting…" : loggedIn ? "Buy credits" : "Sign up to buy"}
      </button>
      {msg && <p className="mt-2 text-center text-xs text-slate-600">{msg}</p>}
    </div>
  );
}
