import { NextResponse } from "next/server";

import { chargeShareCreation } from "@/lib/mpp";

export async function GET(request: Request) {
  const paymentGate = await chargeShareCreation(request);
  if (paymentGate?.challenge) {
    return paymentGate.challenge;
  }

  const response = NextResponse.json({
    ok: true,
    message: "Payment accepted",
    endpoint: "/api/test-paid",
    timestamp: new Date().toISOString(),
  });

  return paymentGate?.withReceipt ? paymentGate.withReceipt(response) : response;
}
