import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";

export const supportAgentsTable = pgTable("support_agents", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type SupportAgent = typeof supportAgentsTable.$inferSelect;
