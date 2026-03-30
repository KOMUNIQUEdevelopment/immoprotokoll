import { db } from "@workspace/db";
import { accountsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { logger } from "./logger";

const SUPERADMIN_EMAIL = "support@immoprotokoll.com";

export async function initSuperAdmin() {
  const existing = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, SUPERADMIN_EMAIL))
    .limit(1);

  if (existing.length > 0) {
    logger.info("Superadmin account already exists");
    return;
  }

  const password = process.env.SUPERADMIN_PASSWORD;
  if (!password) {
    throw new Error(
      "SUPERADMIN_PASSWORD environment variable is required to create the superadmin account. " +
      "Set it via the Replit Secrets panel."
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const [account] = await db
    .insert(accountsTable)
    .values({ name: "ImmoProtokoll Support" })
    .returning();

  await db.insert(usersTable).values({
    accountId: account.id,
    email: SUPERADMIN_EMAIL,
    passwordHash,
    firstName: "Support",
    lastName: "ImmoProtokoll",
    role: "owner",
    isSuperAdmin: true,
  });

  logger.info({ email: SUPERADMIN_EMAIL }, "Superadmin account created");
}
