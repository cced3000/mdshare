import { NextResponse } from "next/server";
import { z } from "zod";

import { createShare } from "@/lib/share-service";

const editableModeSchema = z.enum(["READ_ONLY", "EDIT_LINK"]);
const burnModeSchema = z.enum([
  "OFF",
  "AFTER_FIRST_VIEW_GRACE",
  "AFTER_FIRST_VIEW_INSTANT",
]);

const createShareSchema = z.object({
  markdownContent: z.string().min(1),
  expiresInHours: z.number().int().positive().optional(),
  password: z.string().max(120).optional(),
  burnMode: burnModeSchema.optional(),
  editableMode: editableModeSchema.optional(),
});

export async function POST(request: Request) {
  try {
    const payload = createShareSchema.parse(await request.json());
    const result = await createShare(payload);

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "创建分享时发生未知错误";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
