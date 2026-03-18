import { ZodError } from "zod";

import { localizeErrorMessage, translate, type Language, type TranslationKey } from "@/lib/i18n";

type ApiErrorInfo = {
  message: string;
  status: number;
};

function collectErrorMessages(error: unknown) {
  const messages: string[] = [];
  let current: unknown = error;
  const seen = new Set<unknown>();

  while (current && !seen.has(current)) {
    seen.add(current);

    if (current instanceof Error) {
      if (current.message) {
        messages.push(current.message);
      }

      current = (current as Error & { cause?: unknown }).cause;
      continue;
    }

    break;
  }

  return messages;
}

export function resolveApiError(
  error: unknown,
  language: Language,
  fallbackKey: TranslationKey,
): ApiErrorInfo {
  if (error instanceof ZodError) {
    return {
      message: translate(language, "error.invalidRequest"),
      status: 400,
    };
  }

  const messages = collectErrorMessages(error);
  const normalized = messages.join("\n").toLowerCase();

  if (normalized.includes("no such table: shares") || normalized.includes("no such table: share_views")) {
    return {
      message: translate(language, "error.databaseNotReady"),
      status: 503,
    };
  }

  if (normalized.includes("unable to find cloudflare d1 binding 'db'")) {
    return {
      message: translate(language, "error.databaseBindingMissing"),
      status: 500,
    };
  }

  return {
    message: localizeErrorMessage(
      language,
      messages[0] ?? translate(language, fallbackKey),
      fallbackKey,
    ),
    status: 400,
  };
}

export function resolveServerError(
  error: unknown,
  language: Language,
  fallbackKey: TranslationKey,
): ApiErrorInfo {
  const resolved = resolveApiError(error, language, fallbackKey);

  return {
    ...resolved,
    status: resolved.status >= 500 ? resolved.status : 500,
  };
}
