const Database = require("better-sqlite3");
const path = require("path");

function resolveDatabasePath() {
  const raw = process.env.DATABASE_URL || "file:./dev.db";
  const normalized = raw.startsWith("file:") ? raw.replace(/^file:/, "") : raw;
  return path.resolve(process.cwd(), normalized);
}

const db = new Database(resolveDatabasePath());
db.pragma("journal_mode = WAL");

const rows = db
  .prepare(
    "SELECT id, first_viewed_at FROM shares WHERE burn_mode = 'AFTER_FIRST_VIEW_GRACE' AND burned_at IS NULL AND first_viewed_at IS NOT NULL",
  )
  .all();

const now = new Date();
const timestamp = now.toISOString();
let burned = 0;

for (const row of rows) {
  const deadline = new Date(new Date(row.first_viewed_at).getTime() + 10 * 60 * 1000);
  if (deadline <= now) {
    db.prepare("UPDATE shares SET burned_at = ?, updated_at = ? WHERE id = ?").run(
      timestamp,
      timestamp,
      row.id,
    );
    burned += 1;
  }
}

const expired = db
  .prepare("SELECT COUNT(*) as count FROM shares WHERE expires_at < ? AND deleted_at IS NULL")
  .get(timestamp);

console.log(
  JSON.stringify(
    {
      burned,
      expired: expired.count,
      checkedAt: timestamp,
    },
    null,
    2,
  ),
);
