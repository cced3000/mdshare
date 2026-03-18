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
  fallbackMessage: string,
): ApiErrorInfo {
  const messages = collectErrorMessages(error);
  const normalized = messages.join("\n").toLowerCase();

  if (normalized.includes("no such table: shares") || normalized.includes("no such table: share_views")) {
    return {
      message:
        "数据库尚未初始化。请先运行本地迁移 `pnpm run db:migrate:local`；如果是线上环境，请运行 `pnpm run db:migrate`。",
      status: 503,
    };
  }

  if (normalized.includes("unable to find cloudflare d1 binding 'db'")) {
    return {
      message:
        "未检测到 Cloudflare D1 的 `DB` 绑定。请确认当前环境已按 `wrangler.toml` 正确注入数据库绑定。",
      status: 500,
    };
  }

  return {
    message: messages[0] ?? fallbackMessage,
    status: 400,
  };
}

export function resolveServerError(
  error: unknown,
  fallbackMessage: string,
): ApiErrorInfo {
  const resolved = resolveApiError(error, fallbackMessage);

  return {
    ...resolved,
    status: resolved.status >= 500 ? resolved.status : 500,
  };
}
