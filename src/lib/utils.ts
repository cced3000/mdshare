import { createHash, randomBytes } from "crypto";
import { customAlphabet } from "nanoid";

import { BURN_GRACE_MINUTES, MAX_MARKDOWN_BYTES } from "@/lib/constants";

const slugAlphabet =
  "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const createSlug = customAlphabet(slugAlphabet, 8);

export function generateSlug() {
  return createSlug();
}

export function generateToken() {
  return randomBytes(24).toString("base64url");
}

export function hashSecret(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function getClientFingerprint(parts: Array<string | null | undefined>) {
  const normalized = parts.filter(Boolean).join("|");
  return normalized ? hashSecret(normalized) : null;
}

export function addHours(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

export function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

export function getBurnDeadline(firstViewedAt: Date | null) {
  return firstViewedAt ? addMinutes(firstViewedAt, BURN_GRACE_MINUTES) : null;
}

export function normalizeMarkdown(markdown: string) {
  return markdown.replace(/\r\n/g, "\n").trimEnd();
}

export function inferTitle(title: string | null | undefined, markdown: string) {
  const trimmed = title?.trim();
  if (trimmed) {
    return trimmed.slice(0, 120);
  }

  const headingMatch = markdown.match(/^#\s+(.+)$/m);
  if (headingMatch?.[1]) {
    return headingMatch[1].trim().slice(0, 120);
  }

  const firstLine = markdown
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);

  return (firstLine ?? "Untitled note").slice(0, 120);
}

export function validateMarkdownSize(markdown: string) {
  const size = Buffer.byteLength(markdown, "utf8");
  if (size > MAX_MARKDOWN_BYTES) {
    throw new Error(`Markdown 文件不能超过 ${Math.floor(MAX_MARKDOWN_BYTES / 1024)} KB`);
  }
}

export function formatAbsoluteDate(value: string | Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatRelativeCountdown(target: string | Date | null) {
  if (!target) {
    return null;
  }

  const distance = new Date(target).getTime() - Date.now();
  if (distance <= 0) {
    return "已失效";
  }

  const minutes = Math.floor(distance / 60000);
  if (minutes < 60) {
    return `${minutes} 分钟后`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} 小时后`;
  }

  const days = Math.floor(hours / 24);
  return `${days} 天后`;
}

export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}
