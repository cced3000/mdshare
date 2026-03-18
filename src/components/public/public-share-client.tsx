"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Copy, Download, Flame, KeyRound, Link2, LoaderCircle, ShieldAlert } from "lucide-react";

import { AppBrand } from "@/components/app-brand";
import { useI18n } from "@/components/i18n-provider";
import { MarkdownPreview } from "@/components/markdown-preview";
import { PasswordField } from "@/components/password-field";
import { localizeErrorMessage } from "@/lib/i18n";
import { buildLanguageHeaders } from "@/lib/request-language";
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

export function PublicShareClient({
  slug,
  initialPayload,
}: {
  slug: string;
  initialPayload: PublicPayload;
}) {
  const { language, t } = useI18n();
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

    return t("public.statusLine", {
      absolute: formatAbsoluteDate(payload.share.expiresAt, language),
      relative: formatRelativeCountdown(payload.share.expiresAt, language) ?? t("status.available"),
    });
  }, [language, payload, t]);

  async function handleUnlock(confirmView: boolean) {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/shares/${slug}/public`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...buildLanguageHeaders(language),
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
      setError(
        localizeErrorMessage(
          language,
          unlockError instanceof Error ? unlockError.message : t("error.readFailed"),
          "error.readFailed",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCopyMarkdown() {
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
    const message =
      payload?.state === "expired"
        ? t("public.state.expired")
        : payload?.state === "burned"
          ? t("public.state.burned")
          : payload?.state === "deleted"
            ? t("public.state.deleted")
            : t("public.state.notFound");

    return (
      <main className="viewer-shell">
        <header className="home-topbar viewer-topbar">
          <AppBrand note={t("public.note.readOnly")} />
        </header>
        <section className="viewer-stage">
          <div className="viewer-card viewer-empty viewer-inline-card viewer-state-card">
            <ShieldAlert size={24} />
            <h1>{t("public.linkUnavailable")}</h1>
            <p>{message}</p>
            <Link className="ghost-button" href="/">
              {t("public.backHome")}
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
          <AppBrand note={t("public.note.protected")} />
          {statusLine ? <p className="topbar-note">{statusLine}</p> : null}
        </header>
        <section className="viewer-stage">
          <div
            aria-busy={submitting}
            className="viewer-card viewer-gated viewer-inline-card viewer-gated-card viewer-state-card"
          >
            <div className="viewer-gated-header">
              <div className="modal-summary">
                {payload.passwordRequired ? <span>{t("public.passwordRequired")}</span> : null}
                {payload.burnConfirmationRequired ? (
                  <span>{t("public.burnConfirmationRequired")}</span>
                ) : null}
              </div>
              <p className="muted-line viewer-gated-copy">{t("public.gatedCopy")}</p>
            </div>

            <div className="viewer-gated-body">
              {payload.passwordRequired ? (
                <label className="field">
                  <span>
                    <KeyRound size={16} />
                    {t("public.enterPassword")}
                  </span>
                  <PasswordField
                    disabled={submitting}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={t("public.passwordPlaceholder")}
                    value={password}
                  />
                </label>
              ) : null}

              {payload.burnConfirmationRequired ? (
                <div className="burn-banner burn-banner-soft">
                  <Flame size={18} />
                  <div>
                    <strong>{t("public.burnTitle")}</strong>
                    <p>{t("public.burnBody")}</p>
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
                {submitting ? t("public.preparing") : t("public.viewContent")}
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
        <AppBrand note={t("public.note.readOnly")} />
        <div className="topbar-actions topbar-actions-quiet">
          {statusLine ? <p className="topbar-note topbar-note-inline">{statusLine}</p> : null}
          <button className="ghost-button topbar-tool" onClick={() => void handleCopyMarkdown()} type="button">
            <Copy size={16} />
            {copied ? t("common.copied") : t("public.copyMarkdown")}
          </button>
          <button className="ghost-button topbar-tool" onClick={handleDownloadMarkdown} type="button">
            <Download size={16} />
            {t("public.downloadMd")}
          </button>
        </div>
      </header>
      <section className="viewer-stage">
        <article className="viewer-card viewer-inline-card viewer-content viewer-content-appear">
          <MarkdownPreview markdown={payload.share.markdownContent} emptyLabel={t("public.emptyContent")} />
        </article>
      </section>

      <div className="mobile-bottom-bar">
        <button className="ghost-button topbar-tool" onClick={() => void handleCopyMarkdown()} type="button">
          <Copy size={16} />
          {copied ? t("common.copied") : t("public.copyMarkdown")}
        </button>
        <button className="ghost-button topbar-tool" onClick={handleDownloadMarkdown} type="button">
          <Download size={16} />
          {t("public.downloadMd")}
        </button>
      </div>
    </main>
  );
}
