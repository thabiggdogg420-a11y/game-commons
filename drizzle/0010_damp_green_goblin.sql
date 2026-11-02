CREATE TABLE `usage_daily` (
	`day` text NOT NULL,
	`event` text NOT NULL,
	`count` integer NOT NULL,
	PRIMARY KEY(`day`, `event`),
	CONSTRAINT "usage_event" CHECK("usage_daily"."event" IN ('landing','start','complete')),
	CONSTRAINT "usage_count" CHECK("usage_daily"."count" BETWEEN 0 AND 10000)
);
