import { NextResponse } from "next/server";
import { z } from "zod";

import { getPublicShare, unlockPublicShare } from "@/lib/share-service";

export const runtime = "edge";

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
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const result = await getPublicShare(slug);
  const status = result.state === "not_found" ? 404 : 200;

  return NextResponse.json(result, { status });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;

  try {
    const payload = unlockSchema.parse(await request.json());
    const result = await unlockPublicShare(slug, {
      ...payload,
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
    const message =
      error instanceof Error ? error.message : "访问分享时发生未知错误";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
