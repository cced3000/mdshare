"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Copy, Download, Flame, KeyRound, Link2, LoaderCircle, ShieldAlert } from "lucide-react";

import { MarkdownPreview } from "@/components/markdown-preview";
import { APP_NAME } from "@/lib/constants";
import { formatAbsoluteDate, formatRelativeCountdown } from "@/lib/utils";

export type PublicPayload =
  | {
      state: "available";
      ephemeral?: boolean;
      share: {
        markdownContent: string;
        expiresAt: string;
        burnDeadline: string | null;
        burnMode: string;
      };
    }
  | {
      state: "gated";
      passwordRequired?: boolean;
      burnConfirmationRequired?: boolean;
      share: {
        expiresAt: string;
        burnMode: string;
      };
    }
  | {
      state: "expired" | "burned" | "deleted" | "not_found";
    };

const unavailableCopy: Record<string, string> = {
  expired: "这个分享链接已经过期。",
  burned: "这份内容已经焚毁，无法再次访问。",
  deleted: "这份内容已经被删除。",
  not_found: "没有找到对应的分享内容。",
};

export function PublicShareClient({
  slug,
  initialPayload,
}: {
  slug: string;
  initialPayload: PublicPayload;
}) {
  const [payload, setPayload] = useState<PublicPayload>(initialPayload);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setPayload(initialPayload);
    setPassword("");
    setError(null);
    setSubmitting(false);
  }, [initialPayload, slug]);

  const statusLine = useMemo(() => {
    if (!payload || !("share" in payload)) {
      return null;
    }

    return `到期时间：${formatAbsoluteDate(payload.share.expiresAt)} · ${
      formatRelativeCountdown(payload.share.expiresAt) ?? "可用"
    }`;
  }, [payload]);

  async function handleUnlock(confirmView: boolean) {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/shares/${slug}/public`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password,
          confirmView,
        }),
      });

      const result = (await response.json()) as PublicPayload | { error: string };
      if (!response.ok && "error" in result) {
        throw new Error(result.error);
      }

      if ("state" in result) {
        setPayload(result);
      }
    } catch (unlockError) {
      setError(unlockError instanceof Error ? unlockError.message : "访问失败");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCopyContent() {
    if (!payload || payload.state !== "available") {
      return;
    }

    await navigator.clipboard.writeText(payload.share.markdownContent);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  function handleDownloadMarkdown() {
    if (!payload || payload.state !== "available") {
      return;
    }

    const blob = new Blob([payload.share.markdownContent], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `mdshare-${slug}.md`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  if (
    !payload ||
    payload.state === "not_found" ||
    payload.state === "expired" ||
    payload.state === "burned" ||
    payload.state === "deleted"
  ) {
    const message = unavailableCopy[payload?.state ?? "not_found"];

    return (
      <main className="viewer-shell">
        <header className="home-topbar viewer-topbar">
          <div className="topbar-brand">
            <span className="topbar-name">{APP_NAME}</span>
            <span className="topbar-note">只读访问</span>
          </div>
        </header>
        <section className="viewer-stage">
          <div className="viewer-card viewer-empty viewer-inline-card viewer-state-card">
            <ShieldAlert size={24} />
            <h1>链接不可用</h1>
            <p>{message}</p>
            <Link className="ghost-button" href="/">
              返回首页
            </Link>
          </div>
        </section>
      </main>
    );
  }

  if (payload.state === "gated") {
    return (
      <main className="viewer-shell">
        <header className="home-topbar viewer-topbar">
          <div className="topbar-brand">
            <span className="topbar-name">{APP_NAME}</span>
            <span className="topbar-note">受保护访问</span>
          </div>
          {statusLine ? <p className="topbar-note">{statusLine}</p> : null}
        </header>
        <section className="viewer-stage">
          <div
            aria-busy={submitting}
            className="viewer-card viewer-gated viewer-inline-card viewer-gated-card viewer-state-card"
          >
            <div className="viewer-gated-header">
              <div className="modal-summary">
                {payload.passwordRequired ? <span>需要密码</span> : null}
                {payload.burnConfirmationRequired ? <span>确认查看后销毁</span> : null}
              </div>
              <p className="muted-line viewer-gated-copy">
                验证通过后直接显示正文，页面不会跳转。
              </p>
            </div>

            <div className="viewer-gated-body">
              {payload.passwordRequired ? (
                <label className="field">
                  <span>
                    <KeyRound size={16} />
                    输入访问密码
                  </span>
                  <input
                    className="field-control"
                    disabled={submitting}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Password"
                    type="password"
                    value={password}
                  />
                </label>
              ) : null}

              {payload.burnConfirmationRequired ? (
                <div className="burn-banner burn-banner-soft">
                  <Flame size={18} />
                  <div>
                    <strong>阅后即焚已开启</strong>
                    <p>确认查看后会开始销毁流程，机器人预览不会直接触发焚毁。</p>
                  </div>
                </div>
              ) : null}
            </div>

            {error ? <p className="form-error">{error}</p> : null}

            <div className="viewer-gated-actions">
              <button
                className="primary-button viewer-gated-button"
                disabled={submitting}
                onClick={() => void handleUnlock(Boolean(payload.burnConfirmationRequired))}
                type="button"
              >
                {submitting ? <LoaderCircle className="spin" size={18} /> : <Link2 size={18} />}
                {submitting ? "正在准备内容..." : "查看内容"}
              </button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (payload.state !== "available") {
    return null;
  }

  return (
    <main className="viewer-shell">
      <header className="home-topbar viewer-topbar">
        <div className="topbar-brand">
          <span className="topbar-name">{APP_NAME}</span>
          <span className="topbar-note">只读访问</span>
        </div>
        <div className="topbar-actions topbar-actions-quiet">
          {statusLine ? <p className="topbar-note topbar-note-inline">{statusLine}</p> : null}
          <button className="ghost-button topbar-tool" onClick={() => void handleCopyContent()} type="button">
            <Copy size={16} />
            {copied ? "已复制" : "复制内容"}
          </button>
          <button className="ghost-button topbar-tool" onClick={handleDownloadMarkdown} type="button">
            <Download size={16} />
            下载 .md
          </button>
        </div>
      </header>
      <section className="viewer-stage">
        <article className="viewer-card viewer-inline-card viewer-content viewer-content-appear">
          <MarkdownPreview markdown={payload.share.markdownContent} emptyLabel="这份分享没有内容" />
        </article>
      </section>

      <div className="mobile-bottom-bar">
        <button className="ghost-button topbar-tool" onClick={() => void handleCopyContent()} type="button">
          <Copy size={16} />
          {copied ? "已复制" : "复制内容"}
        </button>
        <button className="ghost-button topbar-tool" onClick={handleDownloadMarkdown} type="button">
          <Download size={16} />
          下载 .md
        </button>
      </div>
    </main>
  );
}
