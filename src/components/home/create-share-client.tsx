"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Clock3,
  Copy,
  Eye,
  FileUp,
  Flame,
  KeyRound,
  Link2,
  NotebookText,
  PencilLine,
  X,
} from "lucide-react";

import { MarkdownPreview } from "@/components/markdown-preview";
import {
  APP_NAME,
  BURN_MODE_OPTIONS,
  DEFAULT_EXPIRY_HOURS,
  DRAFT_STORAGE_KEY,
  EXPIRY_OPTIONS,
  MAX_MARKDOWN_BYTES,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import { AutoResizeTextarea } from "@/components/auto-resize-textarea";

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

const starterMarkdown = `# Quick share

把 Markdown 贴进来，右侧会即时渲染。

## 这份服务适合

- 会议纪要
- 临时说明文档
- 日报或公告
- 一次性协作文稿

> 无需注册，创建后就能拿到分享链接。`;

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <button className="copy-button" onClick={() => void handleCopy()} type="button">
      <Copy size={16} />
      {copied ? "已复制" : label}
    </button>
  );
}

export function CreateShareClient() {
  const [markdown, setMarkdown] = useState(starterMarkdown);
  const [expiresInHours, setExpiresInHours] = useState(DEFAULT_EXPIRY_HOURS);
  const [password, setPassword] = useState("");
  const [burnMode, setBurnMode] = useState<BurnModeValue>("OFF");
  const [editableMode, setEditableMode] = useState<EditableModeValue>("READ_ONLY");
  const [viewMode, setViewMode] = useState<ViewMode>("markdown");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [created, setCreated] = useState<{
    accessUrl: string;
    editUrl: string | null;
    manageUrl: string;
    expiresAt: string;
  } | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!saved) {
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
    }
  }, []);

  useEffect(() => {
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
      setError(`文件不能超过 ${Math.floor(MAX_MARKDOWN_BYTES / 1024)} KB`);
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
        throw new Error("error" in payload ? payload.error : "创建失败");
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
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "创建失败");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <main className="home-shell">
      <div className="noise-layer" />
      <header className="home-topbar">
        <div className="topbar-brand">
          <span className="topbar-name">{APP_NAME}</span>
          <span className="topbar-note">临时 Markdown 分享</span>
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
          <label className="ghost-button topbar-tool topbar-upload">
            <FileUp size={16} />
            上传
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
            onClick={() => setDialogOpen(true)}
            type="button"
          >
            <Link2 size={16} />
            创建分享
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
                  placeholder="把 Markdown 贴到这里"
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

          <div className="editor-footbar">
            <div className="editor-stats">
              <span>{stats.chars} 字符</span>
              <span>
                {stats.sizeKB}/{stats.maxKB} KB
              </span>
            </div>
          </div>
        </div>
      </section>

      {dialogOpen ? (
        <div
          aria-hidden
          className="modal-backdrop"
          onClick={() => setDialogOpen(false)}
        >
          <div
            aria-modal="true"
            className="share-modal has-result"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
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
                <span>
                  <KeyRound size={16} />
                  密码访问
                </span>
                <input
                  className="field-control"
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="留空表示无需密码"
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
                disabled={isCreating}
                onClick={() => void handleCreateShare()}
                type="button"
              >
                <Link2 size={18} />
                {isCreating ? "正在创建..." : "创建分享链接"}
              </button>

              {error ? <p className="form-error">{error}</p> : null}
            </div>

            <div className={cn("share-modal-right", !created && "is-empty")}>
              {created ? (
                <>
                  <div className="modal-title">
                    <Eye size={18} />
                    链接信息
                  </div>

                  <div className="modal-summary">
                    <span>
                      到期 {new Intl.DateTimeFormat("zh-CN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(created.expiresAt))}
                    </span>
                    <span>{created.editUrl ? "含编辑链接" : "只读分享"}</span>
                  </div>

                  <div className="link-list">
                    <div className="link-card">
                      <span>访问链接</span>
                      <code>{created.accessUrl}</code>
                      <div className="link-actions">
                        <CopyButton label="复制访问链接" value={created.accessUrl} />
                        <Link className="ghost-button" href={created.accessUrl} target="_blank">
                          打开
                          <ArrowUpRight size={15} />
                        </Link>
                      </div>
                    </div>

                    {created.editUrl ? (
                      <div className="link-card">
                        <span>编辑链接</span>
                        <code>{created.editUrl}</code>
                        <div className="link-actions">
                          <CopyButton label="复制编辑链接" value={created.editUrl} />
                        </div>
                      </div>
                    ) : null}

                    <div className="link-card">
                      <span>管理链接</span>
                      <code>{created.manageUrl}</code>
                      <div className="link-actions">
                        <CopyButton label="复制管理链接" value={created.manageUrl} />
                      </div>
                    </div>
                  </div>

                  <p className="helper-copy emphasis">
                    管理链接是匿名模式下继续修改、延长有效期或删除内容的唯一凭证之一，请保存好它。
                  </p>
                </>
              ) : (
                <div className="share-preview-empty">
                  <div className="share-empty-hero">
                    <div className="share-empty-ring" />
                    <div className="share-preview-empty-icon">
                      <Link2 size={28} />
                    </div>
                  </div>

                  <p className="share-preview-empty-title">创建后在这里查看分享链接</p>
                  <p className="share-preview-empty-subtitle">
                    设置左侧选项，点击创建按钮即可生成
                  </p>

                  <div className="share-empty-tags">
                    <span className="share-empty-tag">
                      <Eye size={14} />
                      访问链接
                    </span>
                    {editableMode === "EDIT_LINK" ? (
                      <span className="share-empty-tag">
                        <PencilLine size={14} />
                        编辑链接
                      </span>
                    ) : null}
                    <span className="share-empty-tag">
                      <KeyRound size={14} />
                      管理链接
                    </span>
                  </div>

                  <p className="share-empty-hint">
                    链接创建后将在此处显示，支持一键复制
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
