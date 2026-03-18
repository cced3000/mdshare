import { eq, and, lt, isNull, isNotNull, sql } from "drizzle-orm";
import { compare, hash } from "bcrypt-ts/browser";
import { getDb } from "@/lib/db";
import { shares, shareViews } from "@/lib/schema";
import { BURN_GRACE_MINUTES, DEFAULT_EXPIRY_HOURS, EXPIRY_OPTIONS } from "@/lib/constants";
import {
  DEFAULT_LANGUAGE,
  getShareStatusLabel,
  type Language,
} from "@/lib/i18n";
import {
  addHours,
  formatAbsoluteDate,
  generateSlug,
  generateToken,
  getBurnDeadline,
  getClientFingerprint,
  hashSecret,
  normalizeMarkdown,
  validateMarkdownSize,
} from "@/lib/utils";

export type EditableMode = "READ_ONLY" | "EDIT_LINK";
export type BurnMode = "OFF" | "AFTER_FIRST_VIEW_GRACE" | "AFTER_FIRST_VIEW_INSTANT";
export type PublicState =
  | "available"
  | "gated"
  | "expired"
  | "burned"
  | "deleted"
  | "not_found";
export type ManageRole = "owner" | "editor";

export type CreateShareInput = {
  markdownContent: string;
  expiresInHours?: number;
  password?: string;
  burnMode?: BurnMode;
  editableMode?: EditableMode;
};

type ViewerContext = {
  ip?: string | null;
  userAgent?: string | null;
};

type ShareRow = typeof shares.$inferSelect;

const allowedExpiryHours = new Set(EXPIRY_OPTIONS.map((item) => item.hours));

function nowIso() {
  return new Date().toISOString();
}

function createId() {
  return crypto.randomUUID();
}

function getExpiryIso(hours?: number) {
  if (!hours || !allowedExpiryHours.has(hours)) {
    return addHours(DEFAULT_EXPIRY_HOURS).toISOString();
  }
  return addHours(hours).toISOString();
}

function serializeShare(share: ShareRow, language: Language = DEFAULT_LANGUAGE) {
  const burnDeadline = share.firstViewedAt
    ? getBurnDeadline(new Date(share.firstViewedAt))
    : null;
  const status = share.deletedAt
    ? "deleted"
    : share.burnedAt
      ? "burned"
      : new Date(share.expiresAt) <= new Date()
        ? "expired"
        : "available";

  return {
    slug: share.slug,
    markdownContent: share.markdownContent,
    expiresAt: share.expiresAt,
    createdAt: share.createdAt,
    updatedAt: share.updatedAt,
    editableMode: share.editableMode as EditableMode,
    burnMode: share.burnMode as BurnMode,
    firstViewedAt: share.firstViewedAt,
    burnDeadline: burnDeadline?.toISOString() ?? null,
    deletedAt: share.deletedAt,
    burnedAt: share.burnedAt,
    statusLabel: getShareStatusLabel(language, status),
    expiresAtLabel: formatAbsoluteDate(share.expiresAt, language),
  };
}

function getLifecycleState(share: ShareRow | null) {
  const now = new Date();

  if (!share) {
    return "not_found" as const;
  }

  if (share.deletedAt) {
    return "deleted" as const;
  }

  if (share.burnedAt) {
    return "burned" as const;
  }

  if (share.burnMode === "AFTER_FIRST_VIEW_GRACE" && share.firstViewedAt) {
    const burnDeadline = getBurnDeadline(new Date(share.firstViewedAt));
    if (burnDeadline && burnDeadline <= now) {
      return "burned" as const;
    }
  }

  if (new Date(share.expiresAt) <= now) {
    return "expired" as const;
  }

  return "available" as const;
}

async function findShareBySlug(slug: string) {
  const db = getDb();
  const [share] = await db.select().from(shares).where(eq(shares.slug, slug)).limit(1);

  if (!share) {
    return null;
  }

  if (
    share.burnMode === "AFTER_FIRST_VIEW_GRACE" &&
    share.firstViewedAt &&
    !share.burnedAt
  ) {
    const burnDeadline = getBurnDeadline(new Date(share.firstViewedAt));
    if (burnDeadline && burnDeadline <= new Date()) {
      const burnedAt = nowIso();
      await db.update(shares)
        .set({ burnedAt, updatedAt: burnedAt })
        .where(eq(shares.id, share.id));
      share.burnedAt = burnedAt;
      share.updatedAt = burnedAt;
    }
  }

  return share;
}

async function insertShareView(shareId: string, confirmed: boolean, viewer?: ViewerContext) {
  const db = getDb();
  await db.insert(shareViews).values({
    id: createId(),
    shareId,
    viewedAt: nowIso(),
    confirmed: confirmed ? 1 : 0,
    ipHash: await getClientFingerprint([viewer?.ip]),
    userAgentHash: await getClientFingerprint([viewer?.userAgent]),
  });
}

export async function createShare(
  input: CreateShareInput,
  language: Language = DEFAULT_LANGUAGE,
) {
  const markdownContent = normalizeMarkdown(input.markdownContent);
  validateMarkdownSize(markdownContent);

  if (!markdownContent.trim()) {
    throw new Error("请先输入 Markdown 内容");
  }

  const ownerToken = generateToken();
  const editorToken = input.editableMode === "EDIT_LINK" ? generateToken() : null;
  const passwordHash = input.password?.trim()
    ? await hash(input.password.trim(), 10)
    : null;
  const timestamp = nowIso();
  
  const shareData = {
    id: createId(),
    slug: generateSlug(),
    markdownContent: markdownContent,
    expiresAt: getExpiryIso(input.expiresInHours),
    passwordHash: passwordHash,
    editableMode: input.editableMode ?? "READ_ONLY",
    burnMode: input.burnMode ?? "OFF",
    burnedAt: null,
    firstViewedAt: null,
    ownerTokenHash: await hashSecret(ownerToken),
    editorTokenHash: editorToken ? await hashSecret(editorToken) : null,
    createdAt: timestamp,
    updatedAt: timestamp,
    deletedAt: null,
  };

  const db = getDb();
  await db.insert(shares).values(shareData);

  return {
    share: serializeShare(shareData, language),
    ownerToken,
    editorToken,
  };
}

export async function getPublicShare(
  slug: string,
  language: Language = DEFAULT_LANGUAGE,
) {
  const share = await findShareBySlug(slug);

  if (!share) {
    return { state: "not_found" as PublicState };
  }

  const lifecycle = getLifecycleState(share);
  if (lifecycle !== "available") {
    return { state: lifecycle as PublicState };
  }

  const needsBurnConfirmation = share.burnMode !== "OFF" && !share.firstViewedAt;
  const passwordRequired = Boolean(share.passwordHash);

  if (needsBurnConfirmation || passwordRequired) {
    return {
      state: "gated" as PublicState,
      passwordRequired,
      burnConfirmationRequired: needsBurnConfirmation,
      share: {
        expiresAt: share.expiresAt,
        burnMode: share.burnMode as BurnMode,
      },
    };
  }

  return {
    state: "available" as PublicState,
    share: serializeShare(share, language),
  };
}

export async function unlockPublicShare(
  slug: string,
  options: { password?: string; confirmView?: boolean; viewer?: ViewerContext; language?: Language },
) {
  const language = options.language ?? DEFAULT_LANGUAGE;
  const share = await findShareBySlug(slug);
  if (!share) {
    return { state: "not_found" as PublicState };
  }

  const lifecycle = getLifecycleState(share);
  if (lifecycle !== "available") {
    return { state: lifecycle as PublicState };
  }

  if (share.passwordHash) {
    const valid = Boolean(options.password) &&
      (await compare(options.password ?? "", share.passwordHash));

    if (!valid) {
      throw new Error("访问密码不正确");
    }
  }

  if (share.burnMode === "OFF") {
    await insertShareView(share.id, true, options.viewer);
    return {
      state: "available" as PublicState,
      share: serializeShare(share, language),
    };
  }

  if (!options.confirmView && !share.firstViewedAt) {
    return {
      state: "gated" as PublicState,
      passwordRequired: false,
      burnConfirmationRequired: true,
      share: {
        expiresAt: share.expiresAt,
        burnMode: share.burnMode as BurnMode,
      },
    };
  }

  const db = getDb();

  if (share.burnMode === "AFTER_FIRST_VIEW_INSTANT") {
    if (share.firstViewedAt || share.burnedAt) {
      return { state: "burned" as PublicState };
    }

    const timestamp = nowIso();
    await db.update(shares)
      .set({ firstViewedAt: timestamp, burnedAt: timestamp, updatedAt: timestamp })
      .where(eq(shares.id, share.id));
      
    await insertShareView(share.id, true, options.viewer);

    return {
      state: "available" as PublicState,
      ephemeral: true,
      share: serializeShare({
        ...share,
        firstViewedAt: timestamp,
        burnedAt: timestamp,
        updatedAt: timestamp,
      }, language),
    };
  }

  if (!share.firstViewedAt) {
    const timestamp = nowIso();
    await db.update(shares)
      .set({ firstViewedAt: timestamp, updatedAt: timestamp })
      .where(eq(shares.id, share.id));
    share.firstViewedAt = timestamp;
    share.updatedAt = timestamp;
  }

  await insertShareView(share.id, true, options.viewer);

  return {
    state: "available" as PublicState,
    share: serializeShare(share, language),
  };
}

export async function authenticateShareToken(slug: string, token: string | null) {
  if (!token) {
    throw new Error("缺少访问令牌");
  }

  const share = await findShareBySlug(slug);
  if (!share || share.deletedAt) {
    throw new Error("分享不存在或已删除");
  }

  const tokenHash = await hashSecret(token);

  if (tokenHash === share.ownerTokenHash) {
    return { share, role: "owner" as ManageRole };
  }

  if (share.editorTokenHash && tokenHash === share.editorTokenHash) {
    return { share, role: "editor" as ManageRole };
  }

  throw new Error("令牌无效");
}

export async function getManageShare(
  slug: string,
  token: string | null,
  language: Language = DEFAULT_LANGUAGE,
) {
  const { share, role } = await authenticateShareToken(slug, token);
  return {
    role,
    share: serializeShare(share, language),
  };
}

export async function saveShareContent(options: {
  slug: string;
  token: string | null;
  markdownContent: string;
  lastKnownUpdatedAt?: string | null;
  force?: boolean;
  language?: Language;
}) {
  const language = options.language ?? DEFAULT_LANGUAGE;
  const { share, role } = await authenticateShareToken(options.slug, options.token);
  const markdownContent = normalizeMarkdown(options.markdownContent);
  validateMarkdownSize(markdownContent);

  if (!markdownContent.trim()) {
    throw new Error("内容不能为空");
  }

  if (
    options.lastKnownUpdatedAt &&
    !options.force &&
    share.updatedAt !== options.lastKnownUpdatedAt
  ) {
    return {
      conflict: true,
      role,
      share: serializeShare(share, language),
    };
  }

  const timestamp = nowIso();
  const db = getDb();
  await db.update(shares)
    .set({ markdownContent: markdownContent, updatedAt: timestamp })
    .where(eq(shares.id, share.id));

  const updated = {
    ...share,
    markdownContent: markdownContent,
    updatedAt: timestamp,
  };

  return {
    conflict: false,
    role,
    share: serializeShare(updated, language),
  };
}

export async function updateShareSettings(options: {
  slug: string;
  token: string | null;
  expiresInHours: number;
  password?: string;
  burnMode: BurnMode;
  editableMode: EditableMode;
  language?: Language;
}) {
  const language = options.language ?? DEFAULT_LANGUAGE;
  const { share, role } = await authenticateShareToken(options.slug, options.token);
  if (role !== "owner") {
    throw new Error("只有管理链接可以修改分享设置");
  }

  const editorToken =
    options.editableMode === "EDIT_LINK" && !share.editorTokenHash ? generateToken() : null;
  const passwordValue = options.password?.trim() ?? "";
  const passwordHash = passwordValue ? await hash(passwordValue, 10) : null;
  const timestamp = nowIso();
  const expiresAt = getExpiryIso(options.expiresInHours);
  const editorTokenHash =
    options.editableMode === "EDIT_LINK"
      ? share.editorTokenHash ?? (editorToken ? await hashSecret(editorToken) : null)
      : null;

  const db = getDb();
  await db.update(shares)
    .set({
      expiresAt,
      passwordHash,
      burnMode: options.burnMode,
      editableMode: options.editableMode,
      editorTokenHash,
      updatedAt: timestamp,
    })
    .where(eq(shares.id, share.id));

  const updated = {
    ...share,
    expiresAt,
    passwordHash,
    burnMode: options.burnMode,
    editableMode: options.editableMode,
    editorTokenHash,
    updatedAt: timestamp,
  };

  return {
    role,
    share: serializeShare(updated, language),
    editorToken,
  };
}

export async function deleteShare(slug: string, token: string | null) {
  const { share, role } = await authenticateShareToken(slug, token);
  if (role !== "owner") {
    throw new Error("只有管理链接可以删除分享");
  }

  const timestamp = nowIso();
  const db = getDb();
  await db.update(shares)
    .set({ deletedAt: timestamp, updatedAt: timestamp })
    .where(eq(shares.id, share.id));

  return { success: true };
}

export async function cleanupExpiredShares() {
  const now = new Date();
  const db = getDb();
  const queryShares = await db.select({
    id: shares.id,
    firstViewedAt: shares.firstViewedAt,
  })
  .from(shares)
  .where(
    and(
      eq(shares.burnMode, "AFTER_FIRST_VIEW_GRACE"),
      isNull(shares.burnedAt),
      isNotNull(shares.firstViewedAt),
    )
  );

  let burned = 0;
  const timestamp = nowIso();

  for (const share of queryShares) {
    if (!share.firstViewedAt) continue;
    
    const deadline = getBurnDeadline(new Date(share.firstViewedAt));
    if (deadline && deadline <= now) {
      await db.update(shares)
        .set({ burnedAt: timestamp, updatedAt: timestamp })
        .where(eq(shares.id, share.id));
      burned += 1;
    }
  }

  const expiredQuery = await db.select({ count: sql<number>`count(*)` })
    .from(shares)
    .where(
      and(
        lt(shares.expiresAt, timestamp),
        isNull(shares.deletedAt)
      )
    );

  return {
    burned,
    expired: expiredQuery[0]?.count ?? 0,
    checkedAt: timestamp,
    burnGraceMinutes: BURN_GRACE_MINUTES,
  };
}
