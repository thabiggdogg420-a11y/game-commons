CREATE TABLE traffic_visits (
 id text PRIMARY KEY NOT NULL,
 visitor_hash text NOT NULL,
 day text NOT NULL,
 channel text NOT NULL CHECK(channel IN ('claudeai_showcase','sideproject','bluesky','reddit_untagged','direct')),
 is_test integer NOT NULL CHECK(is_test IN (0,1)),
 created_at text NOT NULL,
 last_seen text NOT NULL
);
CREATE INDEX traffic_visits_visitor_idx ON traffic_visits(visitor_hash,last_seen);
CREATE INDEX traffic_visits_day_idx ON traffic_visits(day,is_test,channel);
ALTER TABLE feedback ADD COLUMN attribution text;
