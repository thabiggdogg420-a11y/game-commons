CREATE TABLE `moderation_events` (
	`id` text PRIMARY KEY NOT NULL,
	`report_id` text NOT NULL,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`note` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`report_id`) REFERENCES `reports`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `moderation_events_report_idx` ON `moderation_events` (`report_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `moderation_holds` (
	`game_id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`reason` text NOT NULL,
	`report_id` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `report_usage` (
	`id` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	CONSTRAINT "report_daily_limit" CHECK("report_usage"."count" BETWEEN 0 AND 10)
);
--> statement-breakpoint
CREATE TABLE `reports` (
	`id` text PRIMARY KEY NOT NULL,
	`reporter` text NOT NULL,
	`game_id` text NOT NULL,
	`game_title` text NOT NULL,
	`version` integer NOT NULL,
	`category` text NOT NULL,
	`details` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`resolution` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `reports_queue_idx` ON `reports` (`status`,`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `reports_reporter_idx` ON `reports` (`reporter`,`created_at`);