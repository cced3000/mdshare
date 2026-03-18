import type { Metadata } from "next";
import type { ReactNode } from "react";

import "@/app/globals.css";
import { AppFooter, I18nProvider } from "@/components/i18n-provider";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `${APP_NAME} | Temporary Markdown sharing`,
  description:
    "Create temporary Markdown share links with optional passwords, expiry dates, burn-after-reading, and edit links.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <I18nProvider>
          <div className="app-frame">
            <div className="app-content">{children}</div>
            <AppFooter />
          </div>
        </I18nProvider>
      </body>
    </html>
  );
}
