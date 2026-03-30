import { db } from "@workspace/db";
import { accountsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { logger } from "./logger";

const SUPERADMIN_EMAIL = "support@immoprotokoll.com";
const SUPERADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD ?? "ImmoProtokoll#Superadmin2026!";

export async function initSuperAdmin() {
  try {
    const existing = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, SUPERADMIN_EMAIL))
      .limit(1);

    if (existing.length > 0) {
      logger.info("Superadmin account already exists");
      return;
    }

    const passwordHash = await bcrypt.hash(SUPERADMIN_PASSWORD, 12);

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
  } catch (err) {
    logger.error({ err }, "Failed to initialize superadmin account");
  }
}
