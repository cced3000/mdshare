import { NextResponse } from "next/server";
import { z } from "zod";

import { resolveApiError } from "@/lib/api-errors";
import { getRequestLanguage } from "@/lib/request-language";
import { updateShareSettings } from "@/lib/share-service";

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
  const language = getRequestLanguage(request);
  const { slug } = await context.params;

  try {
    const payload = settingsSchema.parse(await request.json());
    const result = await updateShareSettings({
      language,
      slug,
      token: readToken(request),
      ...payload,
    });

    return NextResponse.json(result);
  } catch (error) {
    const { message, status } = resolveApiError(error, language, "error.saveSettingsFailed");
    return NextResponse.json({ error: message }, { status });
  }
}
