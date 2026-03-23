import { z } from "zod";

export const editableModeSchema = z.enum(["READ_ONLY", "EDIT_LINK"]);
export const burnModeSchema = z.enum([
  "OFF",
  "AFTER_FIRST_VIEW_GRACE",
  "AFTER_FIRST_VIEW_INSTANT",
]);

export const createShareSchema = z.object({
  markdownContent: z.string().min(1),
  expiresInHours: z.number().int().positive().optional(),
  password: z.string().max(120).optional(),
  burnMode: burnModeSchema.optional(),
  editableMode: editableModeSchema.optional(),
});

export type CreateShareRequest = z.infer<typeof createShareSchema>;
