import { NextResponse } from "next/server";
import { z } from "zod";

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
  const { slug } = await context.params;

  try {
    const result = await getManageShare(slug, readToken(request));
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "读取分享内容时发生未知错误";

    return NextResponse.json({ error: message }, { status: 401 });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;

  try {
    const payload = saveSchema.parse(await request.json());
    const result = await saveShareContent({
      slug,
      token: readToken(request),
      ...payload,
    });

    return NextResponse.json(result, { status: result.conflict ? 409 : 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "保存分享内容时发生未知错误";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;

  try {
    const result = await deleteShare(slug, readToken(request));
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "删除分享时发生未知错误";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
