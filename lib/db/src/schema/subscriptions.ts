import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { accountsTable } from "./accounts";
import { planEnum, billingIntervalEnum, subscriptionStatusEnum } from "./accounts";

export const subscriptionsTable = pgTable("subscriptions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  accountId: text("account_id")
    .notNull()
    .references(() => accountsTable.id, { onDelete: "cascade" })
    .unique(),
  stripeSubscriptionId: text("stripe_subscription_id").notNull().unique(),
  stripeCustomerId: text("stripe_customer_id").notNull(),
  plan: planEnum("plan").notNull(),
  billingInterval: billingIntervalEnum("billing_interval").notNull(),
  currency: text("currency").notNull().default("chf"),
  status: subscriptionStatusEnum("status").notNull(),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  canceledAt: timestamp("canceled_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Subscription = typeof subscriptionsTable.$inferSelect;
