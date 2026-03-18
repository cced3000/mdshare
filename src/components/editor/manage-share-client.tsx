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

import { AppBrand } from "@/components/app-brand";
import { AutoResizeTextarea } from "@/components/auto-resize-textarea";
import { useI18n } from "@/components/i18n-provider";
import { MarkdownPreview } from "@/components/markdown-preview";
import { PasswordField } from "@/components/password-field";
import {
  BURN_MODE_OPTIONS,
  DEFAULT_EXPIRY_HOURS,
  EDITOR_AUTOSAVE_DEBOUNCE_MS,
  EDITOR_POLL_INTERVAL_MS,
  EXPIRY_OPTIONS,
} from "@/lib/constants";
import {
  getBurnModeLabel,
  getEditableModeLabel,
  getExpiryOptionLabel,
  getShareStatusLabel,
  localizeErrorMessage,
  type ShareStatus,
} from "@/lib/i18n";
import { buildLanguageHeaders } from "@/lib/request-language";
import { cn, formatAbsoluteDate } from "@/lib/utils";

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

function getShareStatus(share: ManagePayload["share"]): ShareStatus {
  if (share.deletedAt) {
    return "deleted";
  }

  if (share.burnedAt) {
    return "burned";
  }

  if (new Date(share.expiresAt) <= new Date()) {
    return "expired";
  }

  return "available";
}

function CopyButton({ label, value }: { label: string; value: string }) {
  const { t } = useI18n();
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
      {copied ? t("common.copied") : label}
    </button>
  );
}

export function ManageShareClient({ slug }: { slug: string }) {
  const { language, t } = useI18n();
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

  const expiryOptions = useMemo(
    () => EXPIRY_OPTIONS.map((option) => ({ ...option, label: getExpiryOptionLabel(language, option.hours) })),
    [language],
  );
  const burnOptions = useMemo(
    () => BURN_MODE_OPTIONS.map((option) => ({ ...option, label: getBurnModeLabel(language, option.value) })),
    [language],
  );

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
            ...buildLanguageHeaders(language),
            "x-share-token": currentToken,
          },
          cache: "no-store",
      });

      const result = (await response.json()) as ManagePayload | { error: string };
      if (!response.ok || "error" in result) {
        throw new Error("error" in result ? result.error : t("error.readFailed"));
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
    [language, slug, t],
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentUrl(window.location.href);
    }

    const currentToken = parseTokenFromHash();
    setToken(currentToken);

    if (!currentToken) {
      setError(t("error.missingToken"));
      setLoading(false);
      return;
    }

    void loadManageShare(currentToken).catch((loadError) => {
      setError(
        localizeErrorMessage(
          language,
          loadError instanceof Error ? loadError.message : t("error.readFailed"),
          "error.readFailed",
        ),
      );
      setLoading(false);
    });
  }, [language, loadManageShare, t]);

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

  const saveContent = useCallback(
    async (force: boolean) => {
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
            ...buildLanguageHeaders(language),
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
          setInfo(t("manage.remoteConflictTitle"));
          return;
        }

        if (!response.ok || "error" in result) {
          throw new Error("error" in result ? result.error : t("error.saveFailed"));
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
        setInfo(
          t("manage.infoAutoSaved", {
            date: formatAbsoluteDate(result.share.updatedAt, language),
          }),
        );
      } catch (saveError) {
        setError(
          localizeErrorMessage(
            language,
            saveError instanceof Error ? saveError.message : t("error.saveFailed"),
            "error.saveFailed",
          ),
        );
      } finally {
        setSaving(false);
      }
    },
    [language, markdown, payload, slug, t, token],
  );

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
            ...buildLanguageHeaders(language),
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
        throw new Error("error" in result ? result.error : t("error.saveSettingsFailed"));
      }

      setPayload({
        role: result.role,
        share: result.share,
      });
      lastSyncedAtRef.current = result.share.updatedAt;
      setInfo(t("manage.settingsSaved"));

      if (result.editorToken) {
        const editUrl = `${window.location.origin}/e/${slug}#edit=${result.editorToken}`;
        await navigator.clipboard.writeText(editUrl);
        setInfo(t("manage.newEditLinkCopied"));
      }
    } catch (settingsError) {
      setError(
        localizeErrorMessage(
          language,
          settingsError instanceof Error ? settingsError.message : t("error.saveSettingsFailed"),
          "error.saveSettingsFailed",
        ),
      );
    } finally {
      setSettingsSaving(false);
    }
  }

  async function handleDelete() {
    if (!token) {
      return;
    }

    if (!window.confirm(t("manage.confirmDelete"))) {
      return;
    }

    try {
      const response = await fetch(`/api/shares/${slug}/manage`, {
        method: "DELETE",
        headers: {
          ...buildLanguageHeaders(language),
          "x-share-token": token,
        },
      });

      const result = (await response.json()) as { success: boolean } | { error: string };
      if (!response.ok || "error" in result) {
        throw new Error("error" in result ? result.error : t("error.deleteFailed"));
      }

      window.location.href = "/";
    } catch (deleteError) {
      setError(
        localizeErrorMessage(
          language,
          deleteError instanceof Error ? deleteError.message : t("error.deleteFailed"),
          "error.deleteFailed",
        ),
      );
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
          {t("manage.loading")}
        </div>
      </main>
    );
  }

  if (error && !payload) {
    return (
      <main className="viewer-shell">
        <div className="viewer-card viewer-empty">
          <ShieldAlert size={24} />
          <h1>{t("manage.unableToOpen")}</h1>
          <p>{error}</p>
          <Link className="ghost-button" href="/">
            {t("public.backHome")}
          </Link>
        </div>
      </main>
    );
  }

  if (!payload) {
    return null;
  }

  const statusLabel = getShareStatusLabel(language, getShareStatus(payload.share));

  return (
    <main className="manage-shell">
      <header className="home-topbar">
        <AppBrand note={payload.role === "owner" ? t("manage.note.owner") : t("manage.note.editor")} />

        <div className="topbar-actions topbar-actions-quiet">
          <div className="view-toggle" role="tablist" aria-label={t("common.displayMode")}>
            <button
              aria-selected={viewMode === "markdown"}
              className={cn("view-toggle-button", viewMode === "markdown" && "is-active")}
              onClick={() => setViewMode("markdown")}
              role="tab"
              type="button"
            >
              {t("common.markdown")}
            </button>
            <button
              aria-selected={viewMode === "preview"}
              className={cn("view-toggle-button", viewMode === "preview" && "is-active")}
              onClick={() => setViewMode("preview")}
              role="tab"
              type="button"
            >
              {t("common.preview")}
            </button>
          </div>
          <Link className="ghost-button topbar-tool topbar-upload" href={accessUrl} target="_blank">
            <Eye size={16} />
            {t("manage.previewPublic")}
          </Link>
          <button
            className="ghost-button topbar-tool topbar-tool-accent topbar-create"
            onClick={() => setDialogOpen(true)}
            type="button"
          >
            <Settings2 size={16} />
            {payload.role === "owner" ? t("manage.linkAndSettings") : t("manage.linkInfo")}
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
                    <MarkdownPreview copyable markdown={markdown} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {remoteConflict ? (
            <div className="warning-banner">
              <AlertTriangle size={18} />
              <div>
                <strong>{t("manage.remoteConflictTitle")}</strong>
                <p>{t("manage.remoteConflictBody")}</p>
              </div>
              <button className="ghost-button" onClick={() => void saveContent(true)} type="button">
                {t("manage.forceSave")}
              </button>
            </div>
          ) : null}

          <div className="editor-footbar">
            <div className="editor-stats">
              <span>{t("home.statsChars", { count: stats.chars })}</span>
              <span>{stats.sizeKB} KB</span>
            </div>
            <div className="toolbar-actions">
              <p className="panel-subtitle">{saving ? t("manage.autoSaving") : t("manage.autoSaveEnabled")}</p>
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
                    {t("manage.shareSettings")}
                  </div>
                  <button
                    aria-label={t("common.close")}
                    className="icon-button"
                    onClick={() => setDialogOpen(false)}
                    type="button"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="modal-summary">
                  <span>{statusLabel}</span>
                  <span>{t("common.expiresAt", { date: formatAbsoluteDate(payload.share.expiresAt, language) })}</span>
                  <span>{getEditableModeLabel(language, editableMode)}</span>
                </div>

                <label className="field">
                  <span>
                    <Clock3 size={16} />
                    {t("home.expiry")}
                  </span>
                  <select
                    className="field-control"
                    onChange={(event) => setExpiresInHours(Number(event.target.value))}
                    value={expiresInHours}
                  >
                    {expiryOptions.map((option) => (
                      <option key={option.hours} value={option.hours}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>{t("manage.resetPassword")}</span>
                  <PasswordField
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={t("manage.resetPasswordPlaceholder")}
                    value={password}
                  />
                </label>

                <label className="field">
                  <span>
                    <Flame size={16} />
                    {t("home.burnMode")}
                  </span>
                  <select
                    className="field-control"
                    onChange={(event) => setBurnMode(event.target.value as BurnModeValue)}
                    value={burnMode}
                  >
                    {burnOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>
                    <PencilLine size={16} />
                    {t("home.editPermissions")}
                  </span>
                  <select
                    className="field-control"
                    onChange={(event) => setEditableMode(event.target.value as EditableModeValue)}
                    value={editableMode}
                  >
                    <option value="READ_ONLY">{getEditableModeLabel(language, "READ_ONLY")}</option>
                    <option value="EDIT_LINK">{getEditableModeLabel(language, "EDIT_LINK")}</option>
                  </select>
                </label>

                <button
                  className="primary-button"
                  disabled={settingsSaving}
                  onClick={() => void saveSettings()}
                  type="button"
                >
                  {settingsSaving ? t("manage.saving") : t("manage.saveShareSettings")}
                </button>

                <button className="danger-button" onClick={() => void handleDelete()} type="button">
                  <Trash2 size={17} />
                  {t("manage.deleteShare")}
                </button>
              </div>
            ) : (
              <div className="share-modal-left">
                <div className="modal-header">
                  <div className="modal-title">
                    <Link2 size={18} />
                    {t("manage.linkInfo")}
                  </div>
                  <button
                    aria-label={t("common.close")}
                    className="icon-button"
                    onClick={() => setDialogOpen(false)}
                    type="button"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="modal-summary">
                  <span>{statusLabel}</span>
                  <span>{t("common.expiresAt", { date: formatAbsoluteDate(payload.share.expiresAt, language) })}</span>
                </div>

                <div className="link-card">
                  <span>{t("home.accessLink")}</span>
                  <code>{accessUrl}</code>
                  <div className="link-actions">
                    <CopyButton label={t("home.copyAccessLink")} value={accessUrl} />
                    <Link className="ghost-button" href={accessUrl} target="_blank">
                      {t("common.open")}
                      <ArrowUpRight size={15} />
                    </Link>
                  </div>
                </div>

                <div className="link-card">
                  <span>{t("manage.currentEditLink")}</span>
                  <code>{currentUrl}</code>
                  <div className="link-actions">
                    <CopyButton label={t("home.copyEditLink")} value={currentUrl} />
                  </div>
                </div>
              </div>
            )}

            {payload.role === "owner" ? (
              <div className="share-modal-right">
                <div className="modal-title">
                  <Link2 size={18} />
                  {t("manage.linkInfo")}
                </div>

                <div className="modal-summary">
                  <span>{t("common.createdAt", { date: formatAbsoluteDate(payload.share.createdAt, language) })}</span>
                  <span>{payload.share.burnMode === "OFF" ? t("manage.noBurn") : t("manage.burnEnabled")}</span>
                </div>

                <div className="link-list">
                  <div className="link-card">
                    <span>{t("home.accessLink")}</span>
                    <code>{accessUrl}</code>
                    <div className="link-actions">
                      <CopyButton label={t("home.copyAccessLink")} value={accessUrl} />
                      <Link className="ghost-button" href={accessUrl} target="_blank">
                        {t("common.open")}
                        <ArrowUpRight size={15} />
                      </Link>
                    </div>
                  </div>

                  <div className="link-card">
                    <span>{t("manage.currentManageLink")}</span>
                    <code>{currentUrl}</code>
                    <div className="link-actions">
                      <CopyButton label={t("home.copyManageLink")} value={currentUrl} />
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="mobile-bottom-bar">
        <div className="view-toggle" role="tablist" aria-label={t("common.displayMode")}>
          <button
            aria-selected={viewMode === "markdown"}
            className={cn("view-toggle-button", viewMode === "markdown" && "is-active")}
            onClick={() => setViewMode("markdown")}
            role="tab"
            type="button"
          >
            {t("common.markdown")}
          </button>
          <button
            aria-selected={viewMode === "preview"}
            className={cn("view-toggle-button", viewMode === "preview" && "is-active")}
            onClick={() => setViewMode("preview")}
            role="tab"
            type="button"
          >
            {t("common.preview")}
          </button>
        </div>
        <Link className="ghost-button topbar-tool topbar-upload" href={accessUrl} target="_blank">
          <Eye size={16} />
          {t("common.preview")}
        </Link>
        <button
          className="ghost-button topbar-tool topbar-tool-accent topbar-create"
          onClick={() => setDialogOpen(true)}
          type="button"
        >
          <Settings2 size={16} />
          {t("manage.settings")}
        </button>
      </div>
    </main>
  );
}
