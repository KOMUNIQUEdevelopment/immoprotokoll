import { pgTable, text, timestamp, jsonb, primaryKey, unique } from "drizzle-orm/pg-core";
import { accountsTable } from "./accounts";

export const syncProtocolsTable = pgTable(
  "sync_protocols",
  {
    id: text("id").notNull(),
    accountId: text("account_id")
      .notNull()
      .references(() => accountsTable.id, { onDelete: "cascade" }),
    data: jsonb("data").notNull().$type<Record<string, unknown>>(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  // Composite PK scopes data to account; unique("id") makes the protocol UUID
  // globally addressable so tenant-view public routes can safely query by id alone.
  (t) => [primaryKey({ columns: [t.accountId, t.id] }), unique("sync_protocols_id_unique").on(t.id)]
);

export const syncPhotosTable = pgTable(
  "sync_photos",
  {
    id: text("id").notNull(),
    accountId: text("account_id")
      .notNull()
      .references(() => accountsTable.id, { onDelete: "cascade" }),
    dataUrl: text("data_url").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.accountId, t.id] })]
);

export type SyncProtocol = typeof syncProtocolsTable.$inferSelect;
export type SyncPhoto = typeof syncPhotosTable.$inferSelect;
