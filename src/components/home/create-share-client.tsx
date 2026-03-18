"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  ChevronLeft,
  CircleCheck,
  Clock3,
  Copy,
  Eye,
  FileUp,
  Flame,
  Info,
  KeyRound,
  Link2,
  NotebookText,
  PencilLine,
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
  DRAFT_STORAGE_KEY,
  EXPIRY_OPTIONS,
  MAX_MARKDOWN_BYTES,
} from "@/lib/constants";
import {
  getBurnModeLabel,
  getEditableModeLabel,
  getExpiryOptionLabel,
  getStarterMarkdown,
  localizeErrorMessage,
} from "@/lib/i18n";
import { buildLanguageHeaders } from "@/lib/request-language";
import { cn, formatAbsoluteDate } from "@/lib/utils";

type EditableModeValue = "READ_ONLY" | "EDIT_LINK";
type BurnModeValue = (typeof BURN_MODE_OPTIONS)[number]["value"];

type CreateResponse = {
  share: {
    slug: string;
    expiresAt: string;
  };
  ownerToken: string;
  editorToken: string | null;
};

type ViewMode = "markdown" | "preview";
type MobileCreateModalView = "settings" | "result";

function CopyButton({ value, label }: { value: string; label: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <button className="copy-button compact-button" onClick={() => void handleCopy()} type="button">
      <Copy size={14} />
      {copied ? t("common.copied") : label}
    </button>
  );
}

export function CreateShareClient() {
  const { language, t } = useI18n();
  const starterMarkdown = useMemo(() => getStarterMarkdown(language), [language]);
  const previousStarterRef = useRef(starterMarkdown);
  const draftRestoredRef = useRef(false);

  const [markdown, setMarkdown] = useState(starterMarkdown);
  const [expiresInHours, setExpiresInHours] = useState(DEFAULT_EXPIRY_HOURS);
  const [password, setPassword] = useState("");
  const [burnMode, setBurnMode] = useState<BurnModeValue>("OFF");
  const [editableMode, setEditableMode] = useState<EditableModeValue>("READ_ONLY");
  const [viewMode, setViewMode] = useState<ViewMode>("markdown");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [mobileCreateModalView, setMobileCreateModalView] =
    useState<MobileCreateModalView>("settings");
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [created, setCreated] = useState<{
    accessUrl: string;
    editUrl: string | null;
    manageUrl: string;
    expiresAt: string;
  } | null>(null);

  useEffect(() => {
    if (draftRestoredRef.current) {
      return;
    }

    const saved = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!saved) {
      setMarkdown(starterMarkdown);
      previousStarterRef.current = starterMarkdown;
      draftRestoredRef.current = true;
      return;
    }

    try {
      const parsed = JSON.parse(saved) as {
        markdown?: string;
        expiresInHours?: number;
        password?: string;
        burnMode?: BurnModeValue;
        editableMode?: EditableModeValue;
      };

      setMarkdown(parsed.markdown ?? starterMarkdown);
      setExpiresInHours(parsed.expiresInHours ?? DEFAULT_EXPIRY_HOURS);
      setPassword(parsed.password ?? "");
      setBurnMode(parsed.burnMode ?? "OFF");
      setEditableMode(parsed.editableMode ?? "READ_ONLY");
    } catch {
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
      setMarkdown(starterMarkdown);
    } finally {
      previousStarterRef.current = starterMarkdown;
      draftRestoredRef.current = true;
    }
  }, [starterMarkdown]);

  useEffect(() => {
    if (!draftRestoredRef.current) {
      return;
    }

    setMarkdown((current) => (current === previousStarterRef.current ? starterMarkdown : current));
    previousStarterRef.current = starterMarkdown;
  }, [starterMarkdown]);

  useEffect(() => {
    if (!draftRestoredRef.current) {
      return;
    }

    window.localStorage.setItem(
      DRAFT_STORAGE_KEY,
      JSON.stringify({
        markdown,
        expiresInHours,
        password,
        burnMode,
        editableMode,
      }),
    );
  }, [markdown, expiresInHours, password, burnMode, editableMode]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(max-width: 820px)");
    const syncViewport = () => setIsMobileViewport(mediaQuery.matches);

    syncViewport();
    mediaQuery.addEventListener("change", syncViewport);

    return () => {
      mediaQuery.removeEventListener("change", syncViewport);
    };
  }, []);

  const expiryOptions = useMemo(
    () => EXPIRY_OPTIONS.map((option) => ({ ...option, label: getExpiryOptionLabel(language, option.hours) })),
    [language],
  );
  const burnOptions = useMemo(
    () => BURN_MODE_OPTIONS.map((option) => ({ ...option, label: getBurnModeLabel(language, option.value) })),
    [language],
  );
  const stats = useMemo(() => {
    const bytes = new TextEncoder().encode(markdown).length;
    return {
      chars: markdown.length,
      sizeKB: Math.ceil(bytes / 1024),
      maxKB: Math.floor(MAX_MARKDOWN_BYTES / 1024),
    };
  }, [markdown]);

  async function handleImport(file: File) {
    if (file.size > MAX_MARKDOWN_BYTES) {
      setError(
        t("error.markdownTooLarge", {
          size: Math.floor(MAX_MARKDOWN_BYTES / 1024),
        }),
      );
      return;
    }

    const text = await file.text();
    setMarkdown(text);
  }

  async function handleCreateShare() {
    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch("/api/shares", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...buildLanguageHeaders(language),
        },
        body: JSON.stringify({
          markdownContent: markdown,
          expiresInHours,
          password,
          burnMode,
          editableMode,
        }),
      });

      const payload = (await response.json()) as CreateResponse | { error: string };
      if (!response.ok || "error" in payload) {
        throw new Error("error" in payload ? payload.error : t("error.createFailed"));
      }

      const origin = window.location.origin;
      setCreated({
        accessUrl: `${origin}/s/${payload.share.slug}`,
        editUrl: payload.editorToken
          ? `${origin}/e/${payload.share.slug}#edit=${payload.editorToken}`
          : null,
        manageUrl: `${origin}/e/${payload.share.slug}#manage=${payload.ownerToken}`,
        expiresAt: payload.share.expiresAt,
      });
      if (isMobileViewport) {
        setMobileCreateModalView("result");
      }
    } catch (createError) {
      setError(
        localizeErrorMessage(
          language,
          createError instanceof Error ? createError.message : t("error.createFailed"),
          "error.createFailed",
        ),
      );
    } finally {
      setIsCreating(false);
    }
  }

  function openCreateDialog() {
    setMobileCreateModalView(created ? "result" : "settings");
    setDialogOpen(true);
  }

  const showSettingsPane = !isMobileViewport || mobileCreateModalView === "settings";
  const showResultPane = !isMobileViewport || mobileCreateModalView === "result";

  return (
    <main className="home-shell">
      <div className="noise-layer" />
      <header className="home-topbar">
        <AppBrand note={t("home.note")} />

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
          <label className="ghost-button topbar-tool topbar-upload">
            <FileUp size={16} />
            {t("home.upload")}
            <input
              accept=".md,.markdown,.txt,text/plain"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void handleImport(file);
                }
              }}
              type="file"
            />
          </label>
          <button
            className="ghost-button topbar-tool topbar-tool-accent topbar-create"
            onClick={openCreateDialog}
            type="button"
          >
            <Link2 size={16} />
            {t("home.createShare")}
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
                  onChange={setMarkdown}
                  placeholder={t("home.placeholder")}
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

          <div className="editor-footbar">
            <div className="editor-stats">
              <span>{t("home.statsChars", { count: stats.chars })}</span>
              <span>
                {stats.sizeKB}/{stats.maxKB} KB
              </span>
            </div>
          </div>
        </div>
      </section>

      {dialogOpen ? (
        <div aria-hidden className="modal-backdrop" onClick={() => setDialogOpen(false)}>
          <div
            aria-modal="true"
            className={cn("share-modal", !isMobileViewport && "has-result")}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            {showSettingsPane ? (
              <div className="share-modal-left">
                <div className="modal-header">
                  <div className="modal-title">
                    <NotebookText size={18} />
                    {t("home.shareSettings")}
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
                  <span>
                    <KeyRound size={16} />
                    {t("home.passwordAccess")}
                  </span>
                  <PasswordField
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={t("home.passwordPlaceholder")}
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
                  disabled={isCreating}
                  onClick={() => void handleCreateShare()}
                  type="button"
                >
                  <Link2 size={18} />
                  {isCreating ? t("home.creating") : t("home.createShareLink")}
                </button>

                {error ? <p className="form-error">{error}</p> : null}
              </div>
            ) : null}

            {showResultPane ? (
              <div className={cn("share-modal-right", !created && "is-empty")}>
                {isMobileViewport ? (
                  <div className="modal-header modal-header-mobile">
                    <button
                      aria-label={t("common.back")}
                      className="ghost-button compact-button"
                      onClick={() => setMobileCreateModalView("settings")}
                      type="button"
                    >
                      <ChevronLeft size={16} />
                      {t("common.back")}
                    </button>
                    <button
                      aria-label={t("common.close")}
                      className="icon-button"
                      onClick={() => setDialogOpen(false)}
                      type="button"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ) : null}
                {created ? (
                  <div className="share-result">
                  <div className="share-result-hero">
                    <div className="share-result-ring" />
                    <div className="share-result-icon">
                      <CircleCheck size={28} />
                    </div>
                  </div>

                  <p className="share-result-title">{t("home.resultTitle")}</p>

                  <div className="modal-summary">
                    <span>
                      <Clock3 size={13} />
                      {t("common.expiresAt", {
                        date: formatAbsoluteDate(created.expiresAt, language),
                      })}
                    </span>
                    <span>
                      {created.editUrl ? (
                        <>
                          <PencilLine size={13} />
                          {t("home.summaryIncludesEditLink")}
                        </>
                      ) : (
                        <>
                          <Eye size={13} />
                          {t("home.summaryReadOnlyShare")}
                        </>
                      )}
                    </span>
                  </div>

                  <div className="link-list">
                    <div className="link-card">
                      <span className="link-card-label">
                        <Eye size={15} />
                        {t("home.accessLink")}
                      </span>
                      <code>{created.accessUrl}</code>
                      <div className="link-actions">
                        <CopyButton label={t("home.copyAccessLink")} value={created.accessUrl} />
                        <Link className="ghost-button compact-button" href={created.accessUrl} target="_blank">
                          {t("common.open")}
                          <ArrowUpRight size={13} />
                        </Link>
                      </div>
                    </div>

                    {created.editUrl ? (
                      <div className="link-card">
                        <span className="link-card-label">
                          <PencilLine size={15} />
                          {t("home.editLink")}
                        </span>
                        <code>{created.editUrl}</code>
                        <div className="link-actions">
                          <CopyButton label={t("home.copyEditLink")} value={created.editUrl} />
                        </div>
                      </div>
                    ) : null}

                    <div className="link-card link-card-manage" title={t("home.manageHint")}>
                      <span className="link-card-label">
                        <KeyRound size={15} />
                        {t("home.manageLink")}
                        <Info size={13} className="link-card-tip-icon" />
                      </span>
                      <code>{created.manageUrl}</code>
                      <div className="link-actions">
                        <CopyButton label={t("home.copyManageLink")} value={created.manageUrl} />
                      </div>
                    </div>
                  </div>
                  </div>
                ) : (
                  <div className="share-preview-empty">
                  <div className="share-empty-hero">
                    <div className="share-empty-ring" />
                    <div className="share-preview-empty-icon">
                      <Link2 size={28} />
                    </div>
                  </div>

                  <p className="share-preview-empty-title">{t("home.emptyResultTitle")}</p>
                  <p className="share-preview-empty-subtitle">{t("home.emptyResultSubtitle")}</p>

                  <div className="share-empty-tags">
                    <span className="share-empty-tag">
                      <Eye size={14} />
                      {t("home.emptyTagAccess")}
                    </span>
                    {editableMode === "EDIT_LINK" ? (
                      <span className="share-empty-tag">
                        <PencilLine size={14} />
                        {t("home.emptyTagEdit")}
                      </span>
                    ) : null}
                    <span className="share-empty-tag">
                      <KeyRound size={14} />
                      {t("home.emptyTagManage")}
                    </span>
                  </div>

                  <p className="share-empty-hint">{t("home.emptyHint")}</p>
                  </div>
                )}
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
        <button
          className="ghost-button topbar-tool topbar-tool-accent topbar-create"
          onClick={openCreateDialog}
          type="button"
        >
          <Link2 size={16} />
          {t("home.createShare")}
        </button>
      </div>
    </main>
  );
}
