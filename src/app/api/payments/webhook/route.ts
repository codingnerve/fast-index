import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";

// Razorpay webhook: verifies the HMAC signature, then credits the user on
// payment capture. Configure the same secret in the Razorpay dashboard.
export async function POST(req: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const signature = req.headers.get("x-razorpay-signature") ?? "";
  const raw = await req.text();

  const expected = crypto
    .createHmac("sha256", secret)
    .update(raw)
    .digest("hex");

  if (
    signature.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  ) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(raw) as {
    event: string;
    payload: {
      payment: {
        entity: { id: string; order_id: string };
      };
    };
  };

  if (event.event === "payment.captured") {
    const { id: paymentId, order_id } = event.payload.payment.entity;
    const payment = await prisma.payment.findUnique({
      where: { razorpayOrderId: order_id },
    });

    // Idempotency: only credit once.
    if (payment && payment.status !== "paid") {
      await prisma.$transaction([
        prisma.payment.update({
          where: { id: payment.id },
          data: { status: "paid", razorpayPaymentId: paymentId },
        }),
        prisma.user.update({
          where: { id: payment.userId },
          data: { credits: { increment: payment.credits } },
        }),
        prisma.creditTransaction.create({
          data: { userId: payment.userId, amount: payment.credits, reason: "purchase" },
        }),
      ]);
    }
  }

  return NextResponse.json({ received: true });
}
