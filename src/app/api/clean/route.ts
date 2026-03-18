import { NextResponse } from "next/server";

import { resolveServerError } from "@/lib/api-errors";
import { getRequestLanguage } from "@/lib/request-language";
import { translate } from "@/lib/i18n";
import { cleanupExpiredShares } from "@/lib/share-service";

export async function GET(request: Request) {
  const language = getRequestLanguage(request);
  // 简易鉴权：生产环境下可以通过 header 中的特定 Token 或由 Cloudflare Workers Cron Trigger 触发
  const cronKey = request.headers.get("x-cron-key");
  const url = new URL(request.url);
  const queryKey = url.searchParams.get("key");

  if (
    process.env.CRON_SECRET &&
    cronKey !== process.env.CRON_SECRET &&
    queryKey !== process.env.CRON_SECRET
  ) {
    return NextResponse.json({ error: translate(language, "error.unauthorized") }, { status: 401 });
  }

  try {
    const result = await cleanupExpiredShares();
    return NextResponse.json(result);
  } catch (error) {
    const { message, status } = resolveServerError(error, language, "error.cleanupFailed");
    return NextResponse.json({ error: message }, { status });
  }
}
