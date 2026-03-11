"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Clock3,
  Copy,
  Eye,
  Flame,
  Link2,
  LoaderCircle,
  NotebookText,
  PencilLine,
  Settings2,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";

import { MarkdownPreview } from "@/components/markdown-preview";
import {
  APP_NAME,
  EDITOR_AUTOSAVE_DEBOUNCE_MS,
  BURN_MODE_OPTIONS,
  DEFAULT_EXPIRY_HOURS,
  EDITOR_POLL_INTERVAL_MS,
  EXPIRY_OPTIONS,
} from "@/lib/constants";
import { cn, formatAbsoluteDate } from "@/lib/utils";
import { AutoResizeTextarea } from "@/components/auto-resize-textarea";

type EditableModeValue = "READ_ONLY" | "EDIT_LINK";
type BurnModeValue = (typeof BURN_MODE_OPTIONS)[number]["value"];

type ManagePayload = {
  role: "owner" | "editor";
  share: {
    slug: string;
    markdownContent: string;
    expiresAt: string;
    createdAt: string;
    updatedAt: string;
    editableMode: EditableModeValue;
    burnMode: BurnModeValue;
    deletedAt: string | null;
    burnedAt: string | null;
    statusLabel: string;
  };
};

type ViewMode = "markdown" | "preview";

function parseTokenFromHash() {
  if (typeof window === "undefined") {
    return null;
  }

  const fragment = window.location.hash.replace(/^#/, "");
  const params = new URLSearchParams(fragment);
  return params.get("manage") ?? params.get("edit");
}

function CopyButton({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      className="copy-button"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      }}
      type="button"
    >
      <Copy size={16} />
      {copied ? "已复制" : label}
    </button>
  );
}

export function ManageShareClient({ slug }: { slug: string }) {
  const [token, setToken] = useState<string | null>(null);
  const [payload, setPayload] = useState<ManagePayload | null>(null);
  const [markdown, setMarkdown] = useState("");
  const [expiresInHours, setExpiresInHours] = useState(DEFAULT_EXPIRY_HOURS);
  const [password, setPassword] = useState("");
  const [burnMode, setBurnMode] = useState<BurnModeValue>("OFF");
  const [editableMode, setEditableMode] = useState<EditableModeValue>("READ_ONLY");
  const [viewMode, setViewMode] = useState<ViewMode>("markdown");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [remoteConflict, setRemoteConflict] = useState<ManagePayload["share"] | null>(null);
  const [currentUrl, setCurrentUrl] = useState("");
  const lastSyncedAtRef = useRef<string | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const lastInputAtRef = useRef(0);
  const savingRef = useRef(false);
  const hasUnsavedChangesRef = useRef(false);

  const handleMarkdownChange = useCallback((nextMarkdown: string) => {
    lastInputAtRef.current = Date.now();
    setMarkdown(nextMarkdown);
  }, []);

  const loadManageShare = useCallback(
    async (currentToken: string, silent = false) => {
      if (!silent) {
        setLoading(true);
      }

      const response = await fetch(`/api/shares/${slug}/manage`, {
        headers: {
          "x-share-token": currentToken,
        },
        cache: "no-store",
      });

      const result = (await response.json()) as ManagePayload | { error: string };
      if (!response.ok || "error" in result) {
        throw new Error("error" in result ? result.error : "读取失败");
      }

      setPayload(result);
      setMarkdown((current) => current || result.share.markdownContent);
      setEditableMode(result.share.editableMode);
      setBurnMode(result.share.burnMode);
      lastSyncedAtRef.current = result.share.updatedAt;

      const matchedOption = EXPIRY_OPTIONS.find((option) => {
        const nextDate = new Date(Date.now() + option.hours * 60 * 60 * 1000);
        const shareDate = new Date(result.share.expiresAt);
        return Math.abs(nextDate.getTime() - shareDate.getTime()) < 2 * 60 * 1000;
      });
      setExpiresInHours(matchedOption?.hours ?? DEFAULT_EXPIRY_HOURS);
      setPassword("");
      setLoading(false);

      return result;
    },
    [slug],
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentUrl(window.location.href);
    }

    const currentToken = parseTokenFromHash();
    setToken(currentToken);

    if (!currentToken) {
      setError("链接缺少管理令牌或编辑令牌。");
      setLoading(false);
      return;
    }

    void loadManageShare(currentToken).catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : "读取失败");
      setLoading(false);
    });
  }, [loadManageShare]);

  useEffect(() => {
    if (!token) {
      return;
    }

    const interval = window.setInterval(() => {
      if (document.visibilityState !== "visible") {
        return;
      }

      if (savingRef.current || hasUnsavedChangesRef.current) {
        return;
      }

      if (Date.now() - lastInputAtRef.current < EDITOR_AUTOSAVE_DEBOUNCE_MS) {
        return;
      }

      void loadManageShare(token, true).catch(() => {
        // Silent polling keeps the page fresh without interrupting edits.
      });
    }, EDITOR_POLL_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") {
        return;
      }

      if (savingRef.current || hasUnsavedChangesRef.current) {
        return;
      }

      void loadManageShare(token, true).catch(() => {
        // Restore fresh state when the tab becomes visible again.
      });
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadManageShare, token]);

  useEffect(() => {
    savingRef.current = saving;
  }, [saving]);

  useEffect(() => {
    hasUnsavedChangesRef.current = Boolean(payload && markdown !== payload.share.markdownContent);
  }, [markdown, payload]);

  const saveContent = useCallback(async (force: boolean) => {
    if (!token || !payload) {
      return;
    }

    setSaving(true);
    setInfo(null);
    setError(null);

    try {
      const response = await fetch(`/api/shares/${slug}/manage`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-share-token": token,
        },
        body: JSON.stringify({
          markdownContent: markdown,
          lastKnownUpdatedAt: lastSyncedAtRef.current,
          force,
        }),
      });

      const result = (await response.json()) as
        | {
            conflict: boolean;
            share: ManagePayload["share"];
          }
        | { error: string };

      if (response.status === 409 && "share" in result) {
        setRemoteConflict(result.share);
        setInfo("检测到远端有更新，请决定是否覆盖。");
        return;
      }

      if (!response.ok || "error" in result) {
        throw new Error("error" in result ? result.error : "保存失败");
      }

      setPayload((current) =>
        current
          ? {
              ...current,
              share: result.share,
            }
          : current,
      );
      lastSyncedAtRef.current = result.share.updatedAt;
      setRemoteConflict(null);
      setInfo(`已自动保存 · ${formatAbsoluteDate(result.share.updatedAt)}`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }, [markdown, payload, slug, token]);

  useEffect(() => {
    if (!token || !payload) {
      return;
    }

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }

    if (markdown === payload.share.markdownContent) {
      return;
    }

    saveTimerRef.current = window.setTimeout(() => {
      void saveContent(false);
    }, EDITOR_AUTOSAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, [markdown, payload, saveContent, token]);

  async function saveSettings() {
    if (!token || !payload) {
      return;
    }

    setSettingsSaving(true);
    setError(null);
    setInfo(null);

    try {
      const response = await fetch(`/api/shares/${slug}/settings`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-share-token": token,
        },
        body: JSON.stringify({
          expiresInHours,
          password,
          burnMode,
          editableMode,
        }),
      });

      const result = (await response.json()) as
        | (ManagePayload & { editorToken?: string | null })
        | { error: string };

      if (!response.ok || "error" in result) {
        throw new Error("error" in result ? result.error : "保存设置失败");
      }

      setPayload({
        role: result.role,
        share: result.share,
      });
      lastSyncedAtRef.current = result.share.updatedAt;
      setInfo("分享设置已更新。");

      if (result.editorToken) {
        const editUrl = `${window.location.origin}/e/${slug}#edit=${result.editorToken}`;
        await navigator.clipboard.writeText(editUrl);
        setInfo("已生成新的编辑链接并复制到剪贴板。");
      }
    } catch (settingsError) {
      setError(settingsError instanceof Error ? settingsError.message : "保存设置失败");
    } finally {
      setSettingsSaving(false);
    }
  }

  async function handleDelete() {
    if (!token) {
      return;
    }

    if (!window.confirm("确认删除这份分享？删除后访问链接会立即失效。")) {
      return;
    }

    try {
      const response = await fetch(`/api/shares/${slug}/manage`, {
        method: "DELETE",
        headers: {
          "x-share-token": token,
        },
      });

      const result = (await response.json()) as { success: boolean } | { error: string };
      if (!response.ok || "error" in result) {
        throw new Error("error" in result ? result.error : "删除失败");
      }

      window.location.href = "/";
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "删除失败");
    }
  }

  const accessUrl = useMemo(
    () => (typeof window === "undefined" ? "" : `${window.location.origin}/s/${slug}`),
    [slug],
  );
  const stats = useMemo(() => {
    const bytes = new TextEncoder().encode(markdown).length;
    return {
      chars: markdown.length,
      sizeKB: Math.ceil(bytes / 1024),
    };
  }, [markdown]);

  if (loading) {
    return (
      <main className="viewer-shell">
        <div className="viewer-card">
          <LoaderCircle className="spin" size={22} />
          正在加载管理界面...
        </div>
      </main>
    );
  }

  if (error && !payload) {
    return (
      <main className="viewer-shell">
        <div className="viewer-card viewer-empty">
          <ShieldAlert size={24} />
          <h1>无法打开编辑页</h1>
          <p>{error}</p>
          <Link className="ghost-button" href="/">
            返回首页
          </Link>
        </div>
      </main>
    );
  }

  if (!payload) {
    return null;
  }

  return (
    <main className="manage-shell">
      <header className="home-topbar">
        <div className="topbar-brand">
          <span className="topbar-name">{APP_NAME}</span>
          <span className="topbar-note">
            {payload.role === "owner" ? "管理模式" : "编辑模式"}
          </span>
        </div>

        <div className="topbar-actions topbar-actions-quiet">
          <div className="view-toggle" role="tablist" aria-label="显示模式">
            <button
              aria-selected={viewMode === "markdown"}
              className={cn("view-toggle-button", viewMode === "markdown" && "is-active")}
              onClick={() => setViewMode("markdown")}
              role="tab"
              type="button"
            >
              Markdown
            </button>
            <button
              aria-selected={viewMode === "preview"}
              className={cn("view-toggle-button", viewMode === "preview" && "is-active")}
              onClick={() => setViewMode("preview")}
              role="tab"
              type="button"
            >
              预览
            </button>
          </div>
          <Link className="ghost-button topbar-tool topbar-upload" href={accessUrl} target="_blank">
            <Eye size={16} />
            预览公开页
          </Link>
          <button
            className="ghost-button topbar-tool topbar-tool-accent topbar-create"
            onClick={() => setDialogOpen(true)}
            type="button"
          >
            <Settings2 size={16} />
            {payload.role === "owner" ? "链接与设置" : "链接信息"}
          </button>
        </div>
      </header>

      <section className="content-stage">
        <div className="editor-panel content-focused">
          <div className={cn("single-stage", viewMode === "preview" && "is-preview")}>
            {viewMode === "markdown" ? (
              <div className="stage-pane stage-pane-markdown">
                <AutoResizeTextarea
                  className="markdown-input markdown-input-readable"
                  onChange={handleMarkdownChange}
                  spellCheck={false}
                  value={markdown}
                />
              </div>
            ) : (
              <div className="stage-pane stage-pane-preview">
                <div className="preview-panel preview-panel-readable">
                  <div className="preview-inner">
                    <MarkdownPreview markdown={markdown} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {remoteConflict ? (
            <div className="warning-banner">
              <AlertTriangle size={18} />
              <div>
                <strong>检测到远端更新</strong>
                <p>有人已经改动了这份内容。你可以覆盖远端版本，或手动复制并合并。</p>
              </div>
              <button className="ghost-button" onClick={() => void saveContent(true)} type="button">
                覆盖保存
              </button>
            </div>
          ) : null}

          <div className="editor-footbar">
            <div className="editor-stats">
              <span>{stats.chars} 字符</span>
              <span>{stats.sizeKB} KB</span>
            </div>
            <div className="toolbar-actions">
              <p className="panel-subtitle">
                {saving ? "正在自动保存..." : "已开启自动保存"}
              </p>
            </div>
          </div>

          {info ? <p className="helper-copy emphasis">{info}</p> : null}
          {error ? <p className="form-error">{error}</p> : null}
        </div>
      </section>

      {dialogOpen ? (
        <div aria-hidden className="modal-backdrop" onClick={() => setDialogOpen(false)}>
          <div
            aria-modal="true"
            className={cn("share-modal", payload.role === "owner" && "has-result")}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            {payload.role === "owner" ? (
              <div className="share-modal-left">
                <div className="modal-header">
                  <div className="modal-title">
                    <NotebookText size={18} />
                    分享设置
                  </div>
                  <button
                    aria-label="关闭"
                    className="icon-button"
                    onClick={() => setDialogOpen(false)}
                    type="button"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="modal-summary">
                  <span>{payload.share.statusLabel}</span>
                  <span>到期 {formatAbsoluteDate(payload.share.expiresAt)}</span>
                  <span>{editableMode === "EDIT_LINK" ? "可编辑链接" : "只读链接"}</span>
                </div>

                <label className="field">
                  <span>
                    <Clock3 size={16} />
                    有效期
                  </span>
                  <select
                    className="field-control"
                    onChange={(event) => setExpiresInHours(Number(event.target.value))}
                    value={expiresInHours}
                  >
                    {EXPIRY_OPTIONS.map((option) => (
                      <option key={option.hours} value={option.hours}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>重设密码</span>
                  <input
                    className="field-control"
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="留空表示关闭密码"
                    type="password"
                    value={password}
                  />
                </label>

                <label className="field">
                  <span>
                    <Flame size={16} />
                    阅后即焚
                  </span>
                  <select
                    className="field-control"
                    onChange={(event) => setBurnMode(event.target.value as BurnModeValue)}
                    value={burnMode}
                  >
                    {BURN_MODE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>
                    <PencilLine size={16} />
                    编辑权限
                  </span>
                  <select
                    className="field-control"
                    onChange={(event) => setEditableMode(event.target.value as EditableModeValue)}
                    value={editableMode}
                  >
                    <option value="READ_ONLY">只读</option>
                    <option value="EDIT_LINK">持有编辑链接可编辑</option>
                  </select>
                </label>

                <button
                  className="primary-button"
                  disabled={settingsSaving}
                  onClick={() => void saveSettings()}
                  type="button"
                >
                  {settingsSaving ? "保存中..." : "保存分享设置"}
                </button>

                <button className="danger-button" onClick={() => void handleDelete()} type="button">
                  <Trash2 size={17} />
                  删除分享
                </button>
              </div>
            ) : (
              <div className="share-modal-left">
                <div className="modal-header">
                  <div className="modal-title">
                    <Link2 size={18} />
                    链接信息
                  </div>
                  <button
                    aria-label="关闭"
                    className="icon-button"
                    onClick={() => setDialogOpen(false)}
                    type="button"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="modal-summary">
                  <span>{payload.share.statusLabel}</span>
                  <span>到期 {formatAbsoluteDate(payload.share.expiresAt)}</span>
                </div>

                <div className="link-card">
                  <span>访问链接</span>
                  <code>{accessUrl}</code>
                  <div className="link-actions">
                    <CopyButton label="复制访问链接" value={accessUrl} />
                    <Link className="ghost-button" href={accessUrl} target="_blank">
                      打开
                      <ArrowUpRight size={15} />
                    </Link>
                  </div>
                </div>

                <div className="link-card">
                  <span>当前编辑链接</span>
                  <code>{currentUrl}</code>
                  <div className="link-actions">
                    <CopyButton label="复制当前链接" value={currentUrl} />
                  </div>
                </div>
              </div>
            )}

            {payload.role === "owner" ? (
              <div className="share-modal-right">
                <div className="modal-title">
                  <Link2 size={18} />
                  链接信息
                </div>

                <div className="modal-summary">
                  <span>创建于 {formatAbsoluteDate(payload.share.createdAt)}</span>
                  <span>{payload.share.burnMode === "OFF" ? "不焚毁" : "阅后即焚"}</span>
                </div>

                <div className="link-list">
                  <div className="link-card">
                    <span>访问链接</span>
                    <code>{accessUrl}</code>
                    <div className="link-actions">
                      <CopyButton label="复制访问链接" value={accessUrl} />
                      <Link className="ghost-button" href={accessUrl} target="_blank">
                        打开
                        <ArrowUpRight size={15} />
                      </Link>
                    </div>
                  </div>

                  <div className="link-card">
                    <span>当前管理链接</span>
                    <code>{currentUrl}</code>
                    <div className="link-actions">
                      <CopyButton label="复制管理链接" value={currentUrl} />
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="mobile-bottom-bar">
        <div className="view-toggle" role="tablist" aria-label="显示模式">
          <button
            aria-selected={viewMode === "markdown"}
            className={cn("view-toggle-button", viewMode === "markdown" && "is-active")}
            onClick={() => setViewMode("markdown")}
            role="tab"
            type="button"
          >
            Markdown
          </button>
          <button
            aria-selected={viewMode === "preview"}
            className={cn("view-toggle-button", viewMode === "preview" && "is-active")}
            onClick={() => setViewMode("preview")}
            role="tab"
            type="button"
          >
            预览
          </button>
        </div>
        <Link className="ghost-button topbar-tool topbar-upload" href={accessUrl} target="_blank">
          <Eye size={16} />
          预览
        </Link>
        <button
          className="ghost-button topbar-tool topbar-tool-accent topbar-create"
          onClick={() => setDialogOpen(true)}
          type="button"
        >
          <Settings2 size={16} />
          设置
        </button>
      </div>
    </main>
  );
}
