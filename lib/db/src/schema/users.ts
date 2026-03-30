import { pgTable, text, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { accountsTable } from "./accounts";

export const userRoleEnum = pgEnum("user_role", ["owner", "administrator", "property_manager"]);

export const usersTable = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  accountId: text("account_id")
    .notNull()
    .references(() => accountsTable.id, { onDelete: "cascade" }),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  firstName: text("first_name").notNull().default(""),
  lastName: text("last_name").notNull().default(""),
  role: userRoleEnum("role").notNull().default("owner"),
  isSuperAdmin: boolean("is_super_admin").notNull().default(false),
  preferredLanguage: text("preferred_language").notNull().default("de-CH"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  passwordHash: true,
  isSuperAdmin: true,
  createdAt: true,
  updatedAt: true,
});

// user_roles: explicit role assignments table (complements the denormalized role on users)
export const userRolesTable = pgTable("user_roles", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  role: userRoleEnum("role").notNull(),
  assignedAt: timestamp("assigned_at").notNull().defaultNow(),
  assignedBy: text("assigned_by").references(() => usersTable.id, { onDelete: "set null" }),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
export type SafeUser = Omit<User, "passwordHash">;
export type UserRole = typeof userRolesTable.$inferSelect;
