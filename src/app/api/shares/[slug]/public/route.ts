import { NextResponse } from "next/server";
import { z } from "zod";

import { resolveApiError } from "@/lib/api-errors";
import { getRequestLanguage } from "@/lib/request-language";
import { getPublicShare, unlockPublicShare } from "@/lib/share-service";

const unlockSchema = z.object({
  password: z.string().optional(),
  confirmView: z.boolean().optional(),
});

function getViewerContext(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() ?? null;
  const userAgent = request.headers.get("user-agent");

  return { ip, userAgent };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const language = getRequestLanguage(request);
  const { slug } = await context.params;

  try {
    const result = await getPublicShare(slug, language);
    const status = result.state === "not_found" ? 404 : 200;

    return NextResponse.json(result, { status });
  } catch (error) {
    const { message, status } = resolveApiError(error, language, "error.readFailed");
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const language = getRequestLanguage(request);
  const { slug } = await context.params;

  try {
    const payload = unlockSchema.parse(await request.json());
    const result = await unlockPublicShare(slug, {
      ...payload,
      language,
      viewer: getViewerContext(request),
    });

    const status =
      result.state === "not_found"
        ? 404
        : result.state === "burned" || result.state === "expired" || result.state === "deleted"
          ? 410
          : 200;

    return NextResponse.json(result, { status });
  } catch (error) {
    const { message, status } = resolveApiError(error, language, "error.readFailed");
    return NextResponse.json({ error: message }, { status });
  }
}
