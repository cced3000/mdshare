import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

type GlobalWithDb = typeof globalThis & {
  mdshareDb?: Database.Database;
};

function resolveDatabasePath() {
  const raw = process.env.DATABASE_URL ?? "file:./dev.db";
  const normalized = raw.startsWith("file:") ? raw.replace(/^file:/, "") : raw;
  return path.resolve(process.cwd(), normalized);
}

function createDatabase() {
  const dbPath = resolveDatabasePath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS shares (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      title TEXT,
      markdown_content TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      password_hash TEXT,
      editable_mode TEXT NOT NULL DEFAULT 'READ_ONLY',
      burn_mode TEXT NOT NULL DEFAULT 'OFF',
      burned_at TEXT,
      first_viewed_at TEXT,
      owner_token_hash TEXT NOT NULL,
      editor_token_hash TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS share_views (
      id TEXT PRIMARY KEY,
      share_id TEXT NOT NULL,
      viewed_at TEXT NOT NULL,
      confirmed INTEGER NOT NULL DEFAULT 0,
      ip_hash TEXT,
      user_agent_hash TEXT,
      FOREIGN KEY (share_id) REFERENCES shares(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_shares_slug ON shares(slug);
    CREATE INDEX IF NOT EXISTS idx_share_views_share_id ON share_views(share_id, viewed_at);
  `);

  return db;
}

const globalWithDb = globalThis as GlobalWithDb;

export const db = globalWithDb.mdshareDb ?? createDatabase();

if (process.env.NODE_ENV !== "production") {
  globalWithDb.mdshareDb = db;
}
