import { randomUUID } from "crypto";

import bcrypt from "bcryptjs";

import { db } from "@/lib/db";
import { BURN_GRACE_MINUTES, DEFAULT_EXPIRY_HOURS, EXPIRY_OPTIONS } from "@/lib/constants";
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

type ShareRow = {
  id: string;
  slug: string;
  title: string | null;
  markdown_content: string;
  expires_at: string;
  password_hash: string | null;
  editable_mode: EditableMode;
  burn_mode: BurnMode;
  burned_at: string | null;
  first_viewed_at: string | null;
  owner_token_hash: string;
  editor_token_hash: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

const allowedExpiryHours = new Set(EXPIRY_OPTIONS.map((item) => item.hours));

function nowIso() {
  return new Date().toISOString();
}

function createId() {
  return randomUUID();
}

function getExpiryIso(hours?: number) {
  if (!hours || !allowedExpiryHours.has(hours)) {
    return addHours(DEFAULT_EXPIRY_HOURS).toISOString();
  }

  return addHours(hours).toISOString();
}

function serializeShare(share: ShareRow) {
  const burnDeadline = share.first_viewed_at
    ? getBurnDeadline(new Date(share.first_viewed_at))
    : null;

  return {
    slug: share.slug,
    markdownContent: share.markdown_content,
    expiresAt: share.expires_at,
    createdAt: share.created_at,
    updatedAt: share.updated_at,
    editableMode: share.editable_mode,
    burnMode: share.burn_mode,
    firstViewedAt: share.first_viewed_at,
    burnDeadline: burnDeadline?.toISOString() ?? null,
    deletedAt: share.deleted_at,
    burnedAt: share.burned_at,
    statusLabel: share.deleted_at
      ? "已删除"
      : share.burned_at
        ? "已焚毁"
        : new Date(share.expires_at) <= new Date()
          ? "已过期"
          : "可用",
    expiresAtLabel: formatAbsoluteDate(share.expires_at),
  };
}

function getLifecycleState(share: ShareRow | null) {
  const now = new Date();

  if (!share) {
    return "not_found" as const;
  }

  if (share.deleted_at) {
    return "deleted" as const;
  }

  if (share.burned_at) {
    return "burned" as const;
  }

  if (share.burn_mode === "AFTER_FIRST_VIEW_GRACE" && share.first_viewed_at) {
    const burnDeadline = getBurnDeadline(new Date(share.first_viewed_at));
    if (burnDeadline && burnDeadline <= now) {
      return "burned" as const;
    }
  }

  if (new Date(share.expires_at) <= now) {
    return "expired" as const;
  }

  return "available" as const;
}

function findShareBySlug(slug: string) {
  const share = db
    .prepare("SELECT * FROM shares WHERE slug = ?")
    .get(slug) as ShareRow | undefined;

  if (!share) {
    return null;
  }

  if (
    share.burn_mode === "AFTER_FIRST_VIEW_GRACE" &&
    share.first_viewed_at &&
    !share.burned_at
  ) {
    const burnDeadline = getBurnDeadline(new Date(share.first_viewed_at));
    if (burnDeadline && burnDeadline <= new Date()) {
      const burnedAt = nowIso();
      db.prepare("UPDATE shares SET burned_at = ?, updated_at = ? WHERE id = ?").run(
        burnedAt,
        burnedAt,
        share.id,
      );
      share.burned_at = burnedAt;
      share.updated_at = burnedAt;
    }
  }

  return share;
}

function insertShareView(shareId: string, confirmed: boolean, viewer?: ViewerContext) {
  db.prepare(
    `INSERT INTO share_views (id, share_id, viewed_at, confirmed, ip_hash, user_agent_hash)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    createId(),
    shareId,
    nowIso(),
    confirmed ? 1 : 0,
    getClientFingerprint([viewer?.ip]),
    getClientFingerprint([viewer?.userAgent]),
  );
}

export async function createShare(input: CreateShareInput) {
  const markdownContent = normalizeMarkdown(input.markdownContent);
  validateMarkdownSize(markdownContent);

  if (!markdownContent.trim()) {
    throw new Error("请先输入 Markdown 内容");
  }

  const ownerToken = generateToken();
  const editorToken = input.editableMode === "EDIT_LINK" ? generateToken() : null;
  const passwordHash = input.password?.trim()
    ? await bcrypt.hash(input.password.trim(), 10)
    : null;
  const timestamp = nowIso();
  const share: ShareRow = {
    id: createId(),
    slug: generateSlug(),
    title: null,
    markdown_content: markdownContent,
    expires_at: getExpiryIso(input.expiresInHours),
    password_hash: passwordHash,
    editable_mode: input.editableMode ?? "READ_ONLY",
    burn_mode: input.burnMode ?? "OFF",
    burned_at: null,
    first_viewed_at: null,
    owner_token_hash: hashSecret(ownerToken),
    editor_token_hash: editorToken ? hashSecret(editorToken) : null,
    created_at: timestamp,
    updated_at: timestamp,
    deleted_at: null,
  };

  db.prepare(
    `INSERT INTO shares (
      id, slug, title, markdown_content, expires_at, password_hash, editable_mode, burn_mode,
      burned_at, first_viewed_at, owner_token_hash, editor_token_hash, created_at, updated_at, deleted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    share.id,
    share.slug,
    share.title,
    share.markdown_content,
    share.expires_at,
    share.password_hash,
    share.editable_mode,
    share.burn_mode,
    share.burned_at,
    share.first_viewed_at,
    share.owner_token_hash,
    share.editor_token_hash,
    share.created_at,
    share.updated_at,
    share.deleted_at,
  );

  return {
    share: serializeShare(share),
    ownerToken,
    editorToken,
  };
}

export async function getPublicShare(slug: string) {
  const share = findShareBySlug(slug);

  if (!share) {
    return { state: "not_found" as PublicState };
  }

  const lifecycle = getLifecycleState(share);
  if (lifecycle !== "available") {
    return { state: lifecycle as PublicState };
  }

  const needsBurnConfirmation = share.burn_mode !== "OFF" && !share.first_viewed_at;
  const passwordRequired = Boolean(share.password_hash);

  if (needsBurnConfirmation || passwordRequired) {
    return {
      state: "gated" as PublicState,
      passwordRequired,
      burnConfirmationRequired: needsBurnConfirmation,
      share: {
        expiresAt: share.expires_at,
        burnMode: share.burn_mode,
      },
    };
  }

  return {
    state: "available" as PublicState,
    share: serializeShare(share),
  };
}

export async function unlockPublicShare(
  slug: string,
  options: { password?: string; confirmView?: boolean; viewer?: ViewerContext },
) {
  const share = findShareBySlug(slug);
  if (!share) {
    return { state: "not_found" as PublicState };
  }

  const lifecycle = getLifecycleState(share);
  if (lifecycle !== "available") {
    return { state: lifecycle as PublicState };
  }

  if (share.password_hash) {
    const valid = Boolean(options.password) &&
      (await bcrypt.compare(options.password ?? "", share.password_hash));

    if (!valid) {
      throw new Error("访问密码不正确");
    }
  }

  if (share.burn_mode === "OFF") {
    insertShareView(share.id, true, options.viewer);
    return {
      state: "available" as PublicState,
      share: serializeShare(share),
    };
  }

  if (!options.confirmView && !share.first_viewed_at) {
    return {
      state: "gated" as PublicState,
      passwordRequired: false,
      burnConfirmationRequired: true,
      share: {
        expiresAt: share.expires_at,
        burnMode: share.burn_mode,
      },
    };
  }

  if (share.burn_mode === "AFTER_FIRST_VIEW_INSTANT") {
    if (share.first_viewed_at || share.burned_at) {
      return { state: "burned" as PublicState };
    }

    const timestamp = nowIso();
    db.prepare(
      "UPDATE shares SET first_viewed_at = ?, burned_at = ?, updated_at = ? WHERE id = ?",
    ).run(timestamp, timestamp, timestamp, share.id);
    insertShareView(share.id, true, options.viewer);

    return {
      state: "available" as PublicState,
      ephemeral: true,
      share: serializeShare({
        ...share,
        first_viewed_at: timestamp,
        burned_at: timestamp,
        updated_at: timestamp,
      }),
    };
  }

  if (!share.first_viewed_at) {
    const timestamp = nowIso();
    db.prepare("UPDATE shares SET first_viewed_at = ?, updated_at = ? WHERE id = ?").run(
      timestamp,
      timestamp,
      share.id,
    );
    share.first_viewed_at = timestamp;
    share.updated_at = timestamp;
  }

  insertShareView(share.id, true, options.viewer);

  return {
    state: "available" as PublicState,
    share: serializeShare(share),
  };
}

export async function authenticateShareToken(slug: string, token: string | null) {
  if (!token) {
    throw new Error("缺少访问令牌");
  }

  const share = findShareBySlug(slug);
  if (!share || share.deleted_at) {
    throw new Error("分享不存在或已删除");
  }

  const tokenHash = hashSecret(token);

  if (tokenHash === share.owner_token_hash) {
    return { share, role: "owner" as ManageRole };
  }

  if (share.editor_token_hash && tokenHash === share.editor_token_hash) {
    return { share, role: "editor" as ManageRole };
  }

  throw new Error("令牌无效");
}

export async function getManageShare(slug: string, token: string | null) {
  const { share, role } = await authenticateShareToken(slug, token);
  return {
    role,
    share: serializeShare(share),
  };
}

export async function saveShareContent(options: {
  slug: string;
  token: string | null;
  markdownContent: string;
  lastKnownUpdatedAt?: string | null;
  force?: boolean;
}) {
  const { share, role } = await authenticateShareToken(options.slug, options.token);
  const markdownContent = normalizeMarkdown(options.markdownContent);
  validateMarkdownSize(markdownContent);

  if (!markdownContent.trim()) {
    throw new Error("内容不能为空");
  }

  if (
    options.lastKnownUpdatedAt &&
    !options.force &&
    share.updated_at !== options.lastKnownUpdatedAt
  ) {
    return {
      conflict: true,
      role,
      share: serializeShare(share),
    };
  }

  const timestamp = nowIso();
  db.prepare(
    "UPDATE shares SET markdown_content = ?, updated_at = ? WHERE id = ?",
  ).run(markdownContent, timestamp, share.id);

  const updated = {
    ...share,
    markdown_content: markdownContent,
    updated_at: timestamp,
  };

  return {
    conflict: false,
    role,
    share: serializeShare(updated),
  };
}

export async function updateShareSettings(options: {
  slug: string;
  token: string | null;
  expiresInHours: number;
  password?: string;
  burnMode: BurnMode;
  editableMode: EditableMode;
}) {
  const { share, role } = await authenticateShareToken(options.slug, options.token);
  if (role !== "owner") {
    throw new Error("只有管理链接可以修改分享设置");
  }

  const editorToken =
    options.editableMode === "EDIT_LINK" && !share.editor_token_hash ? generateToken() : null;
  const passwordValue = options.password?.trim() ?? "";
  const passwordHash = passwordValue ? await bcrypt.hash(passwordValue, 10) : null;
  const timestamp = nowIso();
  const expiresAt = getExpiryIso(options.expiresInHours);
  const editorTokenHash =
    options.editableMode === "EDIT_LINK"
      ? share.editor_token_hash ?? (editorToken ? hashSecret(editorToken) : null)
      : null;

  db.prepare(
    `UPDATE shares
     SET expires_at = ?, password_hash = ?, burn_mode = ?, editable_mode = ?, editor_token_hash = ?, updated_at = ?
     WHERE id = ?`,
  ).run(
    expiresAt,
    passwordHash,
    options.burnMode,
    options.editableMode,
    editorTokenHash,
    timestamp,
    share.id,
  );

  const updated = {
    ...share,
    expires_at: expiresAt,
    password_hash: passwordHash,
    burn_mode: options.burnMode,
    editable_mode: options.editableMode,
    editor_token_hash: editorTokenHash,
    updated_at: timestamp,
  };

  return {
    role,
    share: serializeShare(updated),
    editorToken,
  };
}

export async function deleteShare(slug: string, token: string | null) {
  const { share, role } = await authenticateShareToken(slug, token);
  if (role !== "owner") {
    throw new Error("只有管理链接可以删除分享");
  }

  const timestamp = nowIso();
  db.prepare("UPDATE shares SET deleted_at = ?, updated_at = ? WHERE id = ?").run(
    timestamp,
    timestamp,
    share.id,
  );

  return { success: true };
}

export async function cleanupExpiredShares() {
  const now = new Date();
  const shares = db.prepare("SELECT id, first_viewed_at FROM shares WHERE burn_mode = 'AFTER_FIRST_VIEW_GRACE' AND burned_at IS NULL AND first_viewed_at IS NOT NULL").all() as Array<{
    id: string;
    first_viewed_at: string;
  }>;

  let burned = 0;
  const timestamp = nowIso();

  for (const share of shares) {
    const deadline = getBurnDeadline(new Date(share.first_viewed_at));
    if (deadline && deadline <= now) {
      db.prepare("UPDATE shares SET burned_at = ?, updated_at = ? WHERE id = ?").run(
        timestamp,
        timestamp,
        share.id,
      );
      burned += 1;
    }
  }

  const expired = db
    .prepare("SELECT COUNT(*) as count FROM shares WHERE expires_at < ? AND deleted_at IS NULL")
    .get(timestamp) as { count: number };

  return {
    burned,
    expired: expired.count,
    checkedAt: timestamp,
    burnGraceMinutes: BURN_GRACE_MINUTES,
  };
}
