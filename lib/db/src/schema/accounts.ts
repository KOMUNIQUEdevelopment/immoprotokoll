import { pgTable, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const planEnum = pgEnum("plan", ["free", "privat", "agentur", "custom"]);
export const billingIntervalEnum = pgEnum("billing_interval", ["monthly", "annual"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active", "trialing", "past_due", "canceled", "unpaid", "incomplete"
]);

export const accountsTable = pgTable("accounts", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  plan: planEnum("plan").notNull().default("free"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  currency: text("currency").notNull().default("chf"),
  billingInterval: billingIntervalEnum("billing_interval").notNull().default("monthly"),
  subscriptionStatus: subscriptionStatusEnum("subscription_status"),
  currentPeriodEnd: timestamp("current_period_end"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertAccountSchema = createInsertSchema(accountsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAccount = z.infer<typeof insertAccountSchema>;
export type Account = typeof accountsTable.$inferSelect;
