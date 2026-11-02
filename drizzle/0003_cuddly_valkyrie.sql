CREATE TABLE `version_submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`game_id` text NOT NULL,
	`number` integer NOT NULL,
	`request_hash` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE no action
);
