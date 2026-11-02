CREATE TABLE `feedback` (
	`id` text PRIMARY KEY NOT NULL,
	`author` text NOT NULL,
	`category` text NOT NULL,
	`area` text NOT NULL,
	`message` text NOT NULL,
	`device` text NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `feedback_queue_idx` ON `feedback` (`status`,`created_at`,`id`);--> statement-breakpoint
CREATE TABLE `feedback_usage` (
	`id` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	CONSTRAINT "feedback_daily_limit" CHECK("feedback_usage"."count" BETWEEN 0 AND 5)
);
