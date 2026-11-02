CREATE TABLE `contributor_usage` (
	`owner` text PRIMARY KEY NOT NULL,
	`day` text NOT NULL,
	`uploads_today` integer NOT NULL,
	`stored_bytes` integer NOT NULL,
	CONSTRAINT "quota_daily_limit" CHECK("contributor_usage"."uploads_today" BETWEEN 0 AND 20),
	CONSTRAINT "quota_storage_limit" CHECK("contributor_usage"."stored_bytes" BETWEEN 0 AND 104857600)
);
--> statement-breakpoint
ALTER TABLE `games` ADD `withdrawn_at` text;--> statement-breakpoint
CREATE INDEX `games_owner_idx` ON `games` (`owner`);--> statement-breakpoint
CREATE INDEX `games_updated_idx` ON `games` (`updated_at`,`id`);--> statement-breakpoint
CREATE INDEX `versions_game_idx` ON `versions` (`game_id`);