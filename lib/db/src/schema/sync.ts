import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { accountsTable } from "./accounts";

export const syncProtocolsTable = pgTable("sync_protocols", {
  id: text("id").primaryKey(),
  accountId: text("account_id")
    .notNull()
    .references(() => accountsTable.id, { onDelete: "cascade" }),
  data: jsonb("data").notNull().$type<Record<string, unknown>>(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const syncPhotosTable = pgTable("sync_photos", {
  id: text("id").primaryKey(),
  accountId: text("account_id")
    .notNull()
    .references(() => accountsTable.id, { onDelete: "cascade" }),
  dataUrl: text("data_url").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SyncProtocol = typeof syncProtocolsTable.$inferSelect;
export type SyncPhoto = typeof syncPhotosTable.$inferSelect;
