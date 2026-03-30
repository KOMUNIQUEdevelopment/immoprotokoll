import { Router, type Response } from "express";
import { db } from "@workspace/db";
import {
  accountsTable,
  usersTable,
  sessionsTable,
  syncProtocolsTable,
  propertiesTable,
} from "@workspace/db";
import { eq, ilike, count } from "drizzle-orm";
import { requireAuth, requireSuperAdmin, type AuthRequest } from "../middleware/auth";

const router = Router();
const SESSION_COOKIE = "immo_session";

router.use(requireAuth, requireSuperAdmin);

// ── GET /api/superadmin/accounts — list all accounts with stats ──────────────
router.get("/accounts", async (req: AuthRequest, res: Response) => {
  const search = (req.query.search as string | undefined)?.trim() ?? "";
  const page = Math.max(1, parseInt(req.query.page as string ?? "1", 10));
  const limit = 20;
  const offset = (page - 1) * limit;

  try {
    const baseQuery = db
      .select({
        id: accountsTable.id,
        name: accountsTable.name,
        plan: accountsTable.plan,
        subscriptionStatus: accountsTable.subscriptionStatus,
        currentPeriodEnd: accountsTable.currentPeriodEnd,
        customMaxProperties: accountsTable.customMaxProperties,
        customMaxProtocols: accountsTable.customMaxProtocols,
        customMaxUsers: accountsTable.customMaxUsers,
        customPricingNotes: accountsTable.customPricingNotes,
        createdAt: accountsTable.createdAt,
      })
      .from(accountsTable);

    const rows = search
      ? await baseQuery.where(ilike(accountsTable.name, `%${search}%`)).limit(limit).offset(offset)
      : await baseQuery.limit(limit).offset(offset);

    const accountIds = rows.map((r) => r.id);

    const [userCounts, protocolCounts, propertyCounts] = await Promise.all([
      db
        .select({ accountId: usersTable.accountId, cnt: count() })
        .from(usersTable)
        .groupBy(usersTable.accountId),
      db
        .select({ accountId: syncProtocolsTable.accountId, cnt: count() })
        .from(syncProtocolsTable)
        .groupBy(syncProtocolsTable.accountId),
      db
        .select({ accountId: propertiesTable.accountId, cnt: count() })
        .from(propertiesTable)
        .groupBy(propertiesTable.accountId),
    ]);

    const userCountMap = Object.fromEntries(userCounts.map((r) => [r.accountId, r.cnt]));
    const protocolCountMap = Object.fromEntries(protocolCounts.map((r) => [r.accountId, r.cnt]));
    const propertyCountMap = Object.fromEntries(propertyCounts.map((r) => [r.accountId, r.cnt]));

    const totalRows = search
      ? await db.select({ cnt: count() }).from(accountsTable).where(ilike(accountsTable.name, `%${search}%`))
      : await db.select({ cnt: count() }).from(accountsTable);

    const accounts = rows.map((r) => ({
      ...r,
      userCount: userCountMap[r.id] ?? 0,
      protocolCount: protocolCountMap[r.id] ?? 0,
      propertyCount: propertyCountMap[r.id] ?? 0,
    }));

    res.json({
      accounts,
      total: totalRows[0]?.cnt ?? 0,
      page,
      limit,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to load accounts" });
  }
});

// ── GET /api/superadmin/accounts/:id — single account detail ─────────────────
router.get("/accounts/:id", async (req: AuthRequest, res: Response) => {
  const { id } = req.params as { id: string };
  try {
    const rows = await db.select().from(accountsTable).where(eq(accountsTable.id, id)).limit(1);
    if (!rows[0]) { res.status(404).json({ error: "Account not found" }); return; }
    const account = rows[0];

    const [users, protocols, properties] = await Promise.all([
      db.select({ id: usersTable.id, email: usersTable.email, firstName: usersTable.firstName, lastName: usersTable.lastName, role: usersTable.role, createdAt: usersTable.createdAt }).from(usersTable).where(eq(usersTable.accountId, id)),
      db.select({ cnt: count() }).from(syncProtocolsTable).where(eq(syncProtocolsTable.accountId, id)),
      db.select({ cnt: count() }).from(propertiesTable).where(eq(propertiesTable.accountId, id)),
    ]);

    res.json({
      account,
      users,
      protocolCount: protocols[0]?.cnt ?? 0,
      propertyCount: properties[0]?.cnt ?? 0,
    });
  } catch {
    res.status(500).json({ error: "Failed to load account" });
  }
});

// ── PATCH /api/superadmin/accounts/:id — update plan & custom limits ──────────
router.patch("/accounts/:id", async (req: AuthRequest, res: Response) => {
  const { id } = req.params as { id: string };
  const {
    plan,
    customMaxProperties,
    customMaxProtocols,
    customMaxUsers,
    customPricingNotes,
  } = req.body as {
    plan?: string;
    customMaxProperties?: number | null;
    customMaxProtocols?: number | null;
    customMaxUsers?: number | null;
    customPricingNotes?: string | null;
  };

  const validPlans = ["free", "privat", "agentur", "custom"];
  if (plan !== undefined && !validPlans.includes(plan)) {
    res.status(400).json({ error: "Invalid plan" });
    return;
  }

  try {
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (plan !== undefined) updates.plan = plan;
    if (customMaxProperties !== undefined) updates.customMaxProperties = customMaxProperties;
    if (customMaxProtocols !== undefined) updates.customMaxProtocols = customMaxProtocols;
    if (customMaxUsers !== undefined) updates.customMaxUsers = customMaxUsers;
    if (customPricingNotes !== undefined) updates.customPricingNotes = customPricingNotes;

    const [updated] = await db
      .update(accountsTable)
      .set(updates)
      .where(eq(accountsTable.id, id))
      .returning();

    if (!updated) { res.status(404).json({ error: "Account not found" }); return; }
    res.json({ account: updated });
  } catch {
    res.status(500).json({ error: "Failed to update account" });
  }
});

// ── POST /api/superadmin/impersonate/:accountId — start impersonation ─────────
router.post("/impersonate/:accountId", async (req: AuthRequest, res: Response) => {
  const { accountId } = req.params as { accountId: string };
  const sessionId = req.cookies?.[SESSION_COOKIE] as string;

  const targetAccounts = await db.select({ id: accountsTable.id }).from(accountsTable).where(eq(accountsTable.id, accountId)).limit(1);
  if (!targetAccounts[0]) { res.status(404).json({ error: "Account not found" }); return; }

  const superAdminUser = req.user!;
  const realAccountId = superAdminUser.isSuperAdmin
    ? (req.realSuperAdminId ? undefined : superAdminUser.accountId)
    : undefined;

  if (accountId === (realAccountId ?? superAdminUser.accountId)) {
    res.status(400).json({ error: "Cannot impersonate your own account" });
    return;
  }

  try {
    await db
      .update(sessionsTable)
      .set({ impersonatedAccountId: accountId })
      .where(eq(sessionsTable.id, sessionId));

    res.json({ ok: true, impersonatedAccountId: accountId });
  } catch {
    res.status(500).json({ error: "Failed to start impersonation" });
  }
});

// ── DELETE /api/superadmin/impersonate — end impersonation ───────────────────
router.delete("/impersonate", async (req: AuthRequest, res: Response) => {
  const sessionId = req.cookies?.[SESSION_COOKIE] as string;
  try {
    await db
      .update(sessionsTable)
      .set({ impersonatedAccountId: null })
      .where(eq(sessionsTable.id, sessionId));

    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to end impersonation" });
  }
});

// ── GET /api/superadmin/stats — overall system stats ─────────────────────────
router.get("/stats", async (_req: AuthRequest, res: Response) => {
  try {
    const [accountCount, userCount, protocolCount, planBreakdown] = await Promise.all([
      db.select({ cnt: count() }).from(accountsTable),
      db.select({ cnt: count() }).from(usersTable),
      db.select({ cnt: count() }).from(syncProtocolsTable),
      db.select({ plan: accountsTable.plan, cnt: count() }).from(accountsTable).groupBy(accountsTable.plan),
    ]);
    res.json({
      accountCount: accountCount[0]?.cnt ?? 0,
      userCount: userCount[0]?.cnt ?? 0,
      protocolCount: protocolCount[0]?.cnt ?? 0,
      planBreakdown: planBreakdown.reduce<Record<string, number>>((acc, r) => { acc[r.plan] = r.cnt; return acc; }, {}),
    });
  } catch {
    res.status(500).json({ error: "Failed to load stats" });
  }
});

export default router;
