import { NextResponse } from "next/server";
import { z } from "zod";
import { dbConnect } from "@/lib/db";
import { User, CreditTransaction, Payment } from "@/lib/models";
import { getUserId } from "@/lib/auth";
import { getPlan } from "@/lib/plans";

const schema = z.object({ plan: z.enum(["starter", "professional", "enterprise"]) });

/**
 * Creates a Razorpay order for the chosen plan and records a pending Payment.
 * Uses the Razorpay REST API directly (no SDK dependency).
 */
export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const plan = getPlan(parsed.data.plan)!;
  const amountPaise = plan.rupees * 100;

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  await dbConnect();

  // Dev fallback: if Razorpay isn't configured, grant credits immediately so
  // the flow is testable end-to-end without real keys.
  if (!keyId || !keySecret) {
    await User.updateOne({ _id: userId }, { $inc: { credits: plan.credits } });
    await CreditTransaction.create({ userId, amount: plan.credits, reason: "purchase" });
    await Payment.create({
      userId,
      plan: plan.id,
      amountPaise,
      credits: plan.credits,
      status: "paid",
    });
    return NextResponse.json({ devGranted: true, credits: plan.credits });
  }

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: amountPaise,
      currency: "INR",
      notes: { userId, plan: plan.id },
    }),
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Failed to create order" }, { status: 502 });
  }

  const order = (await res.json()) as { id: string };
  await Payment.create({
    userId,
    plan: plan.id,
    amountPaise,
    credits: plan.credits,
    razorpayOrderId: order.id,
    status: "created",
  });

  return NextResponse.json({
    orderId: order.id,
    amount: amountPaise,
    currency: "INR",
    keyId,
    plan: plan.id,
  });
}
