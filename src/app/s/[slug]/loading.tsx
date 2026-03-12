import { APP_NAME } from "@/lib/constants";

export default function ShareLoading() {
  return (
    <main className="viewer-shell">
      <header className="home-topbar viewer-topbar">
        <div className="topbar-brand">
          <span className="topbar-name">{APP_NAME}</span>
          <span className="topbar-note">正在准备内容</span>
        </div>
      </header>

      <section className="viewer-stage">
        <div className="viewer-card viewer-inline-card viewer-route-loading">
          <div className="viewer-loading-header">
            <span className="viewer-loading-dot" />
            <p>正在读取分享内容</p>
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
