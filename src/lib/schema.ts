import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

export const shares = sqliteTable("shares", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title"),
  markdownContent: text("markdown_content").notNull(),
  expiresAt: text("expires_at").notNull(),
  passwordHash: text("password_hash"),
  editableMode: text("editable_mode").notNull().default("READ_ONLY"),
  burnMode: text("burn_mode").notNull().default("OFF"),
  burnedAt: text("burned_at"),
  firstViewedAt: text("first_viewed_at"),
  ownerTokenHash: text("owner_token_hash").notNull(),
  editorTokenHash: text("editor_token_hash"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  deletedAt: text("deleted_at")
}, (table) => {
  return {
    slugIdx: index("idx_shares_slug").on(table.slug),
  };
});

export const shareViews = sqliteTable("share_views", {
  id: text("id").primaryKey(),
  shareId: text("share_id").notNull().references(() => shares.id, { onDelete: "cascade" }),
  viewedAt: text("viewed_at").notNull(),
  confirmed: integer("confirmed").notNull().default(0),
  ipHash: text("ip_hash"),
  userAgentHash: text("user_agent_hash")
}, (table) => {
  return {
    shareIdViewedAtIdx: index("idx_share_views_share_id").on(table.shareId, table.viewedAt),
  };
});
