import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function getDb() {
  // 在 Edge Runtime 中，从全局或请求上下文获取 D1 绑定
  // 如果是本地 mock 环境，可能需要通过 process.env 获取（视具体接入方式而定）
  // 最佳实践是通过 @cloudflare/next-on-pages 的 getRequestContext()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let d1: any;
  try {
    const { getRequestContext } = require("@cloudflare/next-on-pages");
    d1 = getRequestContext()?.env?.DB || process.env.DB || (globalThis as any).process?.env?.DB;
  } catch {
    // Fallback for types/build time if needed
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    d1 = process.env.DB || (globalThis as any).process?.env?.DB || (globalThis as any).__D1_BETA__DB;
  }
  
  if (!d1) {
    throw new Error("Unable to find Cloudflare D1 binding 'DB'");
  }

  return drizzle(d1, { schema });
}
