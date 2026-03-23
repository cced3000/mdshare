import { NextResponse } from "next/server";

import { resolveApiError } from "@/lib/api-errors";
import { createShareSchema } from "@/lib/create-share-request";
import { chargeShareCreation } from "@/lib/mpp";
import { getRequestLanguage } from "@/lib/request-language";
import { createShare } from "@/lib/share-service";

export async function POST(request: Request) {
  const language = getRequestLanguage(request);

  try {
    const paymentGate = await chargeShareCreation(request);
    if (paymentGate?.challenge) {
      return paymentGate.challenge;
    }

    const payload = createShareSchema.parse(await request.json());
    const result = await createShare(payload, language);

    const response = NextResponse.json(result);
    return paymentGate?.withReceipt ? paymentGate.withReceipt(response) : response;
  } catch (error) {
    const { message, status } = resolveApiError(error, language, "error.createFailed");
    return NextResponse.json({ error: message }, { status });
  }
}
