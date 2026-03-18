import { customAlphabet, nanoid } from "nanoid";

import { BURN_GRACE_MINUTES, MAX_MARKDOWN_BYTES } from "@/lib/constants";

const slugAlphabet =
  "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const createSlug = customAlphabet(slugAlphabet, 8);

export function generateSlug() {
  return createSlug();
}

export function generateToken() {
  return nanoid(32);
}

export async function hashSecret(value: string) {
  const msgUint8 = new TextEncoder().encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function getClientFingerprint(parts: Array<string | null | undefined>) {
  const normalized = parts.filter(Boolean).join("|");
  return normalized ? await hashSecret(normalized) : null;
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

const CJK_TEXT_PATTERN =
  "\u2e80-\u2eff\u2f00-\u2fdf\u3040-\u30ff\u3100-\u312f\u31a0-\u31bf\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff";
const CJK_LEFT_SPACING_PATTERN = "A-Za-z0-9@#&%+\\-=\\/\\\\|_*~";
const CJK_RIGHT_SPACING_PATTERN = "A-Za-z0-9!#$%&*+,\\-./:;=?@\\\\^_{}~";

export function optimizeChineseTypography(text: string) {
  return text
    .replace(/\u00a0/g, " ")
    .replace(
      new RegExp(`([${CJK_TEXT_PATTERN}])([${CJK_LEFT_SPACING_PATTERN}])`, "g"),
      "$1 $2",
    )
    .replace(
      new RegExp(`([${CJK_RIGHT_SPACING_PATTERN}])(?!\\s)([${CJK_TEXT_PATTERN}])`, "g"),
      "$1 $2",
    )
    .replace(/ {2,}/g, " ");
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
  const size = new TextEncoder().encode(markdown).length;
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
