import { AppBrand } from "@/components/app-brand";

export default function ShareLoading() {
  return (
    <main className="viewer-shell">
      <header className="home-topbar viewer-topbar">
        <AppBrand note="正在准备内容" />
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
