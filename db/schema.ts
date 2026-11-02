import { sqliteTable, text, integer, check, index, primaryKey } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
export const games = sqliteTable("games", {
  id: text("id").primaryKey(), owner: text("owner").notNull(),
  title: text("title").notNull(), description: text("description").notNull(),
  creator: text("creator").notNull(), genre: text("genre").notNull(),
  tags: text("tags").notNull(), controls: text("controls").notNull(),
  license: text("license").notNull(), attribution: text("attribution").notNull(),
  parentId: text("parent_id"), parentVersion: integer("parent_version"),
  createdAt: text("created_at").notNull(), updatedAt: text("updated_at").notNull(),
  latestVersion: integer("latest_version").notNull(),
  withdrawnAt: text("withdrawn_at"),
}, table=>[index("games_owner_idx").on(table.owner),index("games_updated_idx").on(table.updatedAt,table.id)]);
export const versions = sqliteTable("versions", {
  id: text("id").primaryKey(), gameId: text("game_id").notNull().references(() => games.id),
  number: integer("number").notNull(), objectKey: text("object_key").notNull(),
  sha256: text("sha256").notNull(), bytes: integer("bytes").notNull(),
  notes: text("notes").notNull(), createdAt: text("created_at").notNull(),
}, table=>[index("versions_game_idx").on(table.gameId)]);
export const contributorUsage=sqliteTable("contributor_usage",{
  owner:text("owner").primaryKey(), day:text("day").notNull(),
  uploadsToday:integer("uploads_today").notNull(),storedBytes:integer("stored_bytes").notNull(),
},table=>[
  check("quota_daily_limit",sql`${table.uploadsToday} BETWEEN 0 AND 20`),
  check("quota_storage_limit",sql`${table.storedBytes} BETWEEN 0 AND 104857600`),
]);
export const reports=sqliteTable('reports',{
 id:text('id').primaryKey(),reporter:text('reporter').notNull(),gameId:text('game_id').notNull(),
 gameTitle:text('game_title').notNull(),version:integer('version').notNull(),
 category:text('category').notNull(),details:text('details').notNull(),
 status:text('status').notNull().default('open'),revision:integer('revision').notNull().default(0),
 resolution:text('resolution'),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull(),
},t=>[index('reports_queue_idx').on(t.status,t.createdAt,t.id),index('reports_reporter_idx').on(t.reporter,t.createdAt)]);
export const reportUsage=sqliteTable('report_usage',{
 id:text('id').primaryKey(),count:integer('count').notNull(),
},t=>[check('report_daily_limit',sql`${t.count} BETWEEN 0 AND 10`)]);
export const moderationHolds=sqliteTable('moderation_holds',{
 gameId:text('game_id').primaryKey(),createdAt:text('created_at').notNull(),reason:text('reason').notNull(),reportId:text('report_id').notNull(),
});
export const moderationEvents=sqliteTable('moderation_events',{
 id:text('id').primaryKey(),reportId:text('report_id').notNull().references(()=>reports.id),
 actor:text('actor').notNull(),action:text('action').notNull(),note:text('note').notNull(),createdAt:text('created_at').notNull(),
},t=>[index('moderation_events_report_idx').on(t.reportId,t.createdAt)]);
export const versionSubmissions=sqliteTable('version_submissions',{
 id:text('id').primaryKey(),gameId:text('game_id').notNull().references(()=>games.id),
 number:integer('number').notNull(),requestHash:text('request_hash').notNull(),createdAt:text('created_at').notNull(),
});
export const feedback=sqliteTable('feedback',{
 id:text('id').primaryKey(),author:text('author').notNull(),category:text('category').notNull(),
 attribution:text('attribution'),area:text('area').notNull(),message:text('message').notNull(),device:text('device').notNull(),
 status:text('status').notNull().default('new'),revision:integer('revision').notNull().default(0),
 createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull(),
},t=>[index('feedback_queue_idx').on(t.status,t.createdAt,t.id)]);
export const feedbackUsage=sqliteTable('feedback_usage',{
 id:text('id').primaryKey(),count:integer('count').notNull(),
},t=>[check('feedback_daily_limit',sql`${t.count} BETWEEN 0 AND 5`)]);

export const trafficVisits=sqliteTable('traffic_visits',{
 id:text('id').primaryKey(),visitorHash:text('visitor_hash').notNull(),day:text('day').notNull(),channel:text('channel').notNull(),isTest:integer('is_test').notNull(),createdAt:text('created_at').notNull(),lastSeen:text('last_seen').notNull(),
},t=>[index('traffic_visits_visitor_idx').on(t.visitorHash,t.lastSeen),index('traffic_visits_day_idx').on(t.day,t.isTest,t.channel),check('traffic_channel',sql`${t.channel} IN ('claudeai_showcase','sideproject','claudegamedev','chatgpt_demo','aigamedev_demo','alphaandbetausers','claudecode_showcase','creator_outreach','bluesky_godot','bluesky_tester','youtube_evolution','youtube_crossover','x_evolution','x_crossover','bluesky_evolution','bluesky_crossover','reddit_aigaming_films','reddit_indiedev_film','x_launch','x_vision','bluesky_vision','reddit_vision','x','bluesky_demo','bluesky','reddit_untagged','direct')`),check('traffic_test',sql`${t.isTest} IN (0,1)`)]);

// Aggregate event counts only; no visitor/session keys or event histories.
export const usageDaily=sqliteTable('usage_daily',{
 day:text('day').notNull(),event:text('event').notNull(),count:integer('count').notNull(),
},t=>[primaryKey({columns:[t.day,t.event]}),check('usage_event',sql`${t.event} IN ('landing','start','complete')`),check('usage_count',sql`${t.count} BETWEEN 0 AND 10000`)]);
