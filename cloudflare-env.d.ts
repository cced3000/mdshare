/// <reference types="@cloudflare/workers-types" />

declare global {
  interface CloudflareEnv {
    DB: D1Database;
    MPP_ENABLED?: string;
    MPP_SECRET_KEY?: string;
    MPP_RECIPIENT?: string;
    MPP_AMOUNT?: string;
    MPP_CURRENCY?: string;
    MPP_MODE?: string;
    MPP_WAIT_FOR_CONFIRMATION?: string;
  }
}

export {};
