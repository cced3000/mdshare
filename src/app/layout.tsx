import type { Metadata } from "next";
import type { ReactNode } from "react";

import "@/app/globals.css";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `${APP_NAME} | 临时 Markdown 分享`,
  description:
    "无需登录即可创建临时 Markdown 分享链接，支持密码、到期时间、阅后即焚与编辑链接。",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
