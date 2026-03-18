"use client";

import { AppBrand } from "@/components/app-brand";
import { useI18n } from "@/components/i18n-provider";

export default function ShareLoading() {
  const { t } = useI18n();

  return (
    <main className="viewer-shell">
      <header className="home-topbar viewer-topbar">
        <AppBrand note={t("loading.preparing")} />
      </header>

      <section className="viewer-stage">
        <div className="viewer-card viewer-inline-card viewer-route-loading">
          <div className="viewer-loading-header">
            <span className="viewer-loading-dot" />
            <p>{t("loading.readingShare")}</p>
          </div>
          <div className="viewer-loading-lines" aria-hidden="true">
            <span className="viewer-loading-line viewer-loading-line-short" />
            <span className="viewer-loading-line" />
            <span className="viewer-loading-line viewer-loading-line-soft" />
            <span className="viewer-loading-line" />
            <span className="viewer-loading-line viewer-loading-line-shorter" />
          </div>
        </div>
      </section>
    </main>
  );
}
