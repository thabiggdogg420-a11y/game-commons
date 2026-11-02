CREATE TABLE `external_entries` (
	`generation` text NOT NULL,
	`id` text NOT NULL,
	`title` text NOT NULL,
	`sort_key` text NOT NULL,
	`metadata` text NOT NULL,
	`browser` integer NOT NULL,
	`desktop` integer NOT NULL,
	`content_requirement` text NOT NULL,
	PRIMARY KEY(`generation`, `id`),
	FOREIGN KEY (`generation`) REFERENCES `external_imports`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `external_entries_sort_idx` ON `external_entries` (`generation`,`sort_key`,`id`);--> statement-breakpoint
CREATE INDEX `external_entries_content_idx` ON `external_entries` (`generation`,`content_requirement`,`sort_key`,`id`);--> statement-breakpoint
CREATE TABLE `external_imports` (
	`id` text PRIMARY KEY NOT NULL,
	`state` text DEFAULT 'staging' NOT NULL,
	`expected` integer NOT NULL,
	`created_at` text NOT NULL,
	CONSTRAINT "external_import_count" CHECK("external_imports"."expected" BETWEEN 1 AND 20000),
	CONSTRAINT "external_import_state" CHECK("external_imports"."state" IN ('staging','active','retired'))
);
--> statement-breakpoint
CREATE INDEX `external_import_state_idx` ON `external_imports` (`state`);--> statement-breakpoint
CREATE UNIQUE INDEX `external_one_active_idx` ON `external_imports` (`state`) WHERE "external_imports"."state" = 'active';--> statement-breakpoint
CREATE TABLE `external_terms` (
	`generation` text NOT NULL,
	`term` text NOT NULL,
	`id` text NOT NULL,
	PRIMARY KEY(`generation`, `term`, `id`)
);
--> statement-breakpoint
CREATE INDEX `external_terms_entry_idx` ON `external_terms` (`generation`,`id`);--> statement-breakpoint
-- Schema-only invariant: concurrent staging chunks cannot exceed declared count.
CREATE TRIGGER external_entries_capacity BEFORE INSERT ON external_entries
WHEN NOT EXISTS (SELECT 1 FROM external_entries WHERE generation=NEW.generation AND id=NEW.id)
AND (SELECT COUNT(*) FROM external_entries WHERE generation=NEW.generation)>=(SELECT expected FROM external_imports WHERE id=NEW.generation)
BEGIN SELECT RAISE(ABORT, 'External import exceeds expected count'); END;
--> statement-breakpoint
CREATE TRIGGER external_entries_immutable BEFORE UPDATE ON external_entries
WHEN OLD.metadata<>NEW.metadata
BEGIN SELECT RAISE(ABORT, 'Changed external record requires a new generation'); END;
