import { pgTable, text, timestamp, boolean, integer, pgEnum } from "drizzle-orm/pg-core";

export const roadmapStatusEnum = pgEnum("roadmap_status", [
  "pending",
  "planned",
  "in_progress",
  "done",
  "rejected",
]);

export const roadmapSourceEnum = pgEnum("roadmap_source", [
  "manual",
  "feature_request",
]);

export const roadmapItemsTable = pgTable("roadmap_items", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  titleEn: text("title_en"),
  descriptionEn: text("description_en"),
  status: roadmapStatusEnum("status").notNull().default("planned"),
  source: roadmapSourceEnum("source").notNull().default("manual"),
  isPublished: boolean("is_published").notNull().default(false),
  category: text("category"),
  requesterName: text("requester_name"),
  requesterEmail: text("requester_email"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type RoadmapItem = typeof roadmapItemsTable.$inferSelect;
