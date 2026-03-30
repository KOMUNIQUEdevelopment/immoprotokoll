import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { accountsTable } from "./accounts";

export const propertiesTable = pgTable("properties", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  accountId: text("account_id")
    .notNull()
    .references(() => accountsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  adresse: text("adresse").notNull().default(""),
  language: text("language").notNull().default("de-CH"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Property = typeof propertiesTable.$inferSelect;
export type InsertProperty = typeof propertiesTable.$inferInsert;
