import { pgTable, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { accountsTable } from "./accounts";

export const supportTicketStatusEnum = pgEnum("support_ticket_status", [
  "open",
  "in_progress",
  "closed",
]);

export const supportTicketsTable = pgTable("support_tickets", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  email: text("email").notNull(),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  status: supportTicketStatusEnum("status").notNull().default("open"),
  accountId: text("account_id").references(() => accountsTable.id, { onDelete: "set null" }),
  assignedToAgentId: text("assigned_to_agent_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type SupportTicket = typeof supportTicketsTable.$inferSelect;
