import { NextResponse } from "next/server";
import { z } from "zod";

import { updateShareSettings } from "@/lib/share-service";

export const runtime = "edge";

const settingsSchema = z.object({
  expiresInHours: z.number().int().positive(),
  password: z.string().max(120).optional(),
  burnMode: z.enum(["OFF", "AFTER_FIRST_VIEW_GRACE", "AFTER_FIRST_VIEW_INSTANT"]),
  editableMode: z.enum(["READ_ONLY", "EDIT_LINK"]),
});

function readToken(request: Request) {
  return request.headers.get("x-share-token");
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;

  try {
    const payload = settingsSchema.parse(await request.json());
    const result = await updateShareSettings({
      slug,
      token: readToken(request),
      ...payload,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "修改设置时发生未知错误";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
