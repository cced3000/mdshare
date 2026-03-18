import { NextResponse } from "next/server";
import { z } from "zod";

import { resolveApiError } from "@/lib/api-errors";
import { getRequestLanguage } from "@/lib/request-language";
import { deleteShare, getManageShare, saveShareContent } from "@/lib/share-service";

const saveSchema = z.object({
  markdownContent: z.string().min(1),
  lastKnownUpdatedAt: z.string().datetime().nullable().optional(),
  force: z.boolean().optional(),
});

function readToken(request: Request) {
  return request.headers.get("x-share-token");
}

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const language = getRequestLanguage(request);
  const { slug } = await context.params;

  try {
    const result = await getManageShare(slug, readToken(request), language);
    return NextResponse.json(result);
  } catch (error) {
    const { message, status } = resolveApiError(error, language, "error.readFailed");
    return NextResponse.json({ error: message }, { status: status >= 500 ? status : 401 });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const language = getRequestLanguage(request);
  const { slug } = await context.params;

  try {
    const payload = saveSchema.parse(await request.json());
    const result = await saveShareContent({
      slug,
      language,
      token: readToken(request),
      ...payload,
    });

    return NextResponse.json(result, { status: result.conflict ? 409 : 200 });
  } catch (error) {
    const { message, status } = resolveApiError(error, language, "error.saveFailed");
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const language = getRequestLanguage(request);
  const { slug } = await context.params;

  try {
    const result = await deleteShare(slug, readToken(request));
    return NextResponse.json(result);
  } catch (error) {
    const { message, status } = resolveApiError(error, language, "error.deleteFailed");
    return NextResponse.json({ error: message }, { status });
  }
}
