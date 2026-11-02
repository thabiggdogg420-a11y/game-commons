PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_traffic_visits` (
	`id` text PRIMARY KEY NOT NULL,
	`visitor_hash` text NOT NULL,
	`day` text NOT NULL,
	`channel` text NOT NULL,
	`is_test` integer NOT NULL,
	`created_at` text NOT NULL,
	`last_seen` text NOT NULL,
	CONSTRAINT "traffic_channel" CHECK("__new_traffic_visits"."channel" IN ('claudeai_showcase','sideproject','claudegamedev','chatgpt_demo','aigamedev_demo','alphaandbetausers','claudecode_showcase','creator_outreach','bluesky_godot','bluesky_tester','x_launch','x_vision','bluesky_vision','reddit_vision','x','bluesky_demo','bluesky','reddit_untagged','direct')),
	CONSTRAINT "traffic_test" CHECK("__new_traffic_visits"."is_test" IN (0,1))
);
--> statement-breakpoint
INSERT INTO `__new_traffic_visits`("id", "visitor_hash", "day", "channel", "is_test", "created_at", "last_seen") SELECT "id", "visitor_hash", "day", "channel", "is_test", "created_at", "last_seen" FROM `traffic_visits`;--> statement-breakpoint
DROP TABLE `traffic_visits`;--> statement-breakpoint
ALTER TABLE `__new_traffic_visits` RENAME TO `traffic_visits`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `traffic_visits_visitor_idx` ON `traffic_visits` (`visitor_hash`,`last_seen`);--> statement-breakpoint
CREATE INDEX `traffic_visits_day_idx` ON `traffic_visits` (`day`,`is_test`,`channel`);