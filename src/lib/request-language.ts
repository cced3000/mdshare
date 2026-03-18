import { DEFAULT_LANGUAGE, isLanguage, type Language } from "@/lib/i18n";

function parseAcceptLanguage(headerValue: string | null) {
  if (!headerValue) {
    return null;
  }

  const candidates = headerValue
    .split(",")
    .map((part) => part.trim().split(";")[0]?.toLowerCase())
    .filter(Boolean);

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    if (candidate.startsWith("zh")) {
      return "zh" satisfies Language;
    }

    if (candidate.startsWith("ja")) {
      return "ja" satisfies Language;
    }

    if (candidate.startsWith("en")) {
      return "en" satisfies Language;
    }
  }

  return null;
}

export function getRequestLanguage(request: Request): Language {
  const explicitLanguage = request.headers.get("x-mdshare-lang");
  if (isLanguage(explicitLanguage)) {
    return explicitLanguage;
  }

  return parseAcceptLanguage(request.headers.get("accept-language")) ?? DEFAULT_LANGUAGE;
}

export function buildLanguageHeaders(language: Language) {
  return {
    "x-mdshare-lang": language,
  };
}
