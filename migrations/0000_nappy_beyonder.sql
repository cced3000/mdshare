CREATE TABLE `share_views` (
	`id` text PRIMARY KEY NOT NULL,
	`share_id` text NOT NULL,
	`viewed_at` text NOT NULL,
	`confirmed` integer DEFAULT 0 NOT NULL,
	`ip_hash` text,
	`user_agent_hash` text,
	FOREIGN KEY (`share_id`) REFERENCES `shares`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_share_views_share_id` ON `share_views` (`share_id`,`viewed_at`);--> statement-breakpoint
CREATE TABLE `shares` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`title` text,
	`markdown_content` text NOT NULL,
	`expires_at` text NOT NULL,
	`password_hash` text,
	`editable_mode` text DEFAULT 'READ_ONLY' NOT NULL,
	`burn_mode` text DEFAULT 'OFF' NOT NULL,
	`burned_at` text,
	`first_viewed_at` text,
	`owner_token_hash` text NOT NULL,
	`editor_token_hash` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `shares_slug_unique` ON `shares` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_shares_slug` ON `shares` (`slug`);