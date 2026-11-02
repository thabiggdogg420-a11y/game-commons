CREATE TABLE `games` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`creator` text NOT NULL,
	`genre` text NOT NULL,
	`tags` text NOT NULL,
	`controls` text NOT NULL,
	`license` text NOT NULL,
	`attribution` text NOT NULL,
	`parent_id` text,
	`parent_version` integer,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`latest_version` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `versions` (
	`id` text PRIMARY KEY NOT NULL,
	`game_id` text NOT NULL,
	`number` integer NOT NULL,
	`object_key` text NOT NULL,
	`sha256` text NOT NULL,
	`bytes` integer NOT NULL,
	`notes` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE no action
);
