import { drizzle } from "drizzle-orm/d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import * as schema from "./schema";

function getD1Binding() {
  try {
    return getCloudflareContext().env.DB;
  } catch {
    const fallback = globalThis as typeof globalThis & {
      DB?: D1Database;
      __D1_BETA__DB?: D1Database;
    };

    return fallback.DB ?? fallback.__D1_BETA__DB;
  }
}

export function getDb() {
  const d1 = getD1Binding();

  if (!d1) {
    throw new Error("Unable to find Cloudflare D1 binding 'DB'");
  }

  return drizzle(d1, { schema });
}
