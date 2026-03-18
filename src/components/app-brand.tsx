"use client";

import Link from "next/link";

import { APP_NAME } from "@/lib/constants";

export function AppBrand({ note }: { note: string }) {
  return (
    <Link aria-label="返回首页" className="topbar-brand" href="/">
      <span className="topbar-logo" aria-hidden="true">
        <svg
          className="topbar-logo-svg"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect x="3" y="3" width="26" height="26" rx="8" className="topbar-logo-plate" />
          <path
            d="M9 21V11.5L16 18L23 11.5V21"
            className="topbar-logo-mark"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M10.5 23.5H21.5"
            className="topbar-logo-mark topbar-logo-mark-soft"
            strokeLinecap="round"
          />
        </svg>
      </span>
      <span className="topbar-brand-copy">
        <span className="topbar-name">{APP_NAME}</span>
        <span className="topbar-note">{note}</span>
      </span>
    </Link>
  );
}
