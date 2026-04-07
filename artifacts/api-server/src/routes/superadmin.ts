import { Router, type Response } from "express";
import { db } from "@workspace/db";
import {
  accountsTable,
  usersTable,
  sessionsTable,
  syncProtocolsTable,
  propertiesTable,
  stripeSettingsTable,
} from "@workspace/db";
import { eq, ilike, count } from "drizzle-orm";
import Stripe from "stripe";
import { requireAuth, requireSuperAdmin, type AuthRequest } from "../middleware/auth";
import { getStripeMode, PLAN_PRICES } from "./billing";

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

  const isValidLimit = (v: unknown): boolean =>
    v === null || v === undefined || (typeof v === "number" && Number.isInteger(v) && v >= 0);
  if (!isValidLimit(customMaxProperties) || !isValidLimit(customMaxProtocols) || !isValidLimit(customMaxUsers)) {
    res.status(400).json({ error: "Custom limits must be non-negative integers or null" });
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

// ── GET /api/superadmin/stripe — current mode + key/price status ──────────────
router.get("/stripe", async (_req: AuthRequest, res: Response) => {
  const mode = await getStripeMode();

  const testKeyConfigured = !!process.env.STRIPE_SECRET_KEY_TEST;
  const testPublishableConfigured = !!process.env.STRIPE_PUBLISHABLE_KEY_TEST;
  const testWebhookConfigured = !!process.env.STRIPE_WEBHOOK_SECRET_TEST;
  const liveKeyConfigured = !!process.env.STRIPE_SECRET_KEY;

  // Check which test price IDs are stored in DB
  const testPrices: Record<string, string> = {};
  const plans = ["privat", "agentur"] as const;
  const intervals = ["monthly", "annual"] as const;
  const currencies = ["chf", "eur", "usd"] as const;
  const priceRows = await db.select().from(stripeSettingsTable);
  for (const row of priceRows) {
    if (row.key.startsWith("test_price_")) {
      testPrices[row.key.replace("test_price_", "")] = row.value;
    }
  }

  const expectedPriceCount = plans.length * intervals.length * currencies.length;
  const configuredPriceCount = Object.keys(testPrices).length;

  res.json({
    mode,
    live: { keyConfigured: liveKeyConfigured },
    test: {
      keyConfigured: testKeyConfigured,
      publishableKeyConfigured: testPublishableConfigured,
      webhookSecretConfigured: testWebhookConfigured,
      pricesConfigured: configuredPriceCount,
      pricesExpected: expectedPriceCount,
      prices: testPrices,
    },
  });
});

// ── POST /api/superadmin/stripe/mode — switch live/test ───────────────────────
router.post("/stripe/mode", async (req: AuthRequest, res: Response) => {
  const { mode } = req.body as { mode?: string };
  if (mode !== "live" && mode !== "test") {
    res.status(400).json({ error: "mode must be 'live' or 'test'" });
    return;
  }

  const existing = await db
    .select({ key: stripeSettingsTable.key })
    .from(stripeSettingsTable)
    .where(eq(stripeSettingsTable.key, "mode"))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(stripeSettingsTable)
      .set({ value: mode, updatedAt: new Date() })
      .where(eq(stripeSettingsTable.key, "mode"));
  } else {
    await db.insert(stripeSettingsTable).values({ key: "mode", value: mode });
  }

  res.json({ ok: true, mode });
});

// ── POST /api/superadmin/stripe/setup-test — create test products + prices ────
router.post("/stripe/setup-test", async (_req: AuthRequest, res: Response) => {
  const testKey = process.env.STRIPE_SECRET_KEY_TEST;
  if (!testKey) {
    res.status(503).json({ error: "STRIPE_SECRET_KEY_TEST not configured" });
    return;
  }

  try {
    const stripe = new Stripe(testKey, { apiVersion: "2026-03-25.dahlia" });
    const currencies = ["chf", "eur", "usd"] as const;

    const created: Record<string, string> = {};

    for (const [planName, prices] of Object.entries(PLAN_PRICES) as [keyof typeof PLAN_PRICES, typeof PLAN_PRICES[keyof typeof PLAN_PRICES]][]) {
      // Create or reuse product
      const existingProducts = await stripe.products.search({
        query: `name:"ImmoProtokoll ${planName.charAt(0).toUpperCase() + planName.slice(1)} (Test)"`,
      });
      let product: Stripe.Product;
      if (existingProducts.data.length > 0) {
        product = existingProducts.data[0];
      } else {
        product = await stripe.products.create({
          name: `ImmoProtokoll ${planName.charAt(0).toUpperCase() + planName.slice(1)} (Test)`,
          metadata: { plan: planName, env: "test" },
        });
      }

      for (const currency of currencies) {
        for (const [intervalKey, amount] of [
          ["monthly", prices.monthly] as const,
          ["annual", prices.annual] as const,
        ]) {
          const dbKey = `test_price_${planName}_${intervalKey}_${currency}`;
          const stripeInterval = intervalKey === "monthly" ? "month" : "year";

          // Check if we already have a valid price in DB
          const [existing] = await db
            .select({ value: stripeSettingsTable.value })
            .from(stripeSettingsTable)
            .where(eq(stripeSettingsTable.key, dbKey))
            .limit(1);

          let priceId: string;
          if (existing?.value) {
            // Verify price still exists in Stripe
            try {
              const existingPrice = await stripe.prices.retrieve(existing.value);
              priceId = existingPrice.id;
            } catch {
              // Price gone — create new one
              priceId = "";
            }
          } else {
            priceId = "";
          }

          if (!priceId) {
            const unitAmount = Math.round(amount * 100);
            const newPrice = await stripe.prices.create({
              product: product.id,
              unit_amount: unitAmount,
              currency,
              recurring: { interval: stripeInterval },
              metadata: { plan: planName, interval: intervalKey, currency },
            });
            priceId = newPrice.id;
          }

          // Save to DB
          if (existing?.value) {
            await db
              .update(stripeSettingsTable)
              .set({ value: priceId, updatedAt: new Date() })
              .where(eq(stripeSettingsTable.key, dbKey));
          } else {
            await db.insert(stripeSettingsTable).values({ key: dbKey, value: priceId });
          }
          created[dbKey] = priceId;
        }
      }
    }

    res.json({ ok: true, created, count: Object.keys(created).length });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Stripe error: ${message}` });
  }
});

// ── GET /api/superadmin/coupons — list all coupons + promotion codes ──────────
router.get("/coupons", async (_req: AuthRequest, res: Response) => {
  try {
    const mode = await getStripeMode();
    const stripe = makeStripe(mode);
    const couponsPage = await stripe.coupons.list({ limit: 100 });

    const result = await Promise.all(
      couponsPage.data.map(async (coupon) => {
        const promoCodes = await stripe.promotionCodes.list({ coupon: coupon.id, limit: 100 });
        return {
          coupon: {
            id: coupon.id,
            name: coupon.name,
            percent_off: coupon.percent_off,
            max_redemptions: coupon.max_redemptions,
            times_redeemed: coupon.times_redeemed,
            valid: coupon.valid,
            created: coupon.created,
          },
          promoCodes: promoCodes.data.map((pc) => ({
            id: pc.id,
            code: pc.code,
            active: pc.active,
            customer_email: typeof pc.customer === "object" && pc.customer !== null
              ? (pc.customer as { email?: string }).email ?? null
              : null,
            first_time_transaction: pc.restrictions?.first_time_transaction ?? false,
            times_redeemed: pc.times_redeemed,
            max_redemptions: pc.max_redemptions,
            expires_at: pc.expires_at,
          })),
        };
      })
    );

    res.json({ coupons: result, mode });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ err }, "Failed to list coupons");
    res.status(500).json({ error: msg });
  }
});

// ── POST /api/superadmin/coupons — create coupon + promotion code ──────────────
router.post("/coupons", async (req: AuthRequest, res: Response) => {
  const {
    name,
    percent_off,
    code,
    max_redemptions,
    expires_at,
    restrict_to_email,
    first_time_only,
    duration = "once",
  } = req.body as {
    name?: string;
    percent_off?: number;
    code?: string;
    max_redemptions?: number;
    expires_at?: string;
    restrict_to_email?: string;
    first_time_only?: boolean;
    duration?: "once" | "repeating" | "forever";
  };

  if (!percent_off || percent_off <= 0 || percent_off > 100) {
    res.status(400).json({ error: "percent_off must be between 1 and 100" });
    return;
  }

  try {
    const mode = await getStripeMode();
    const stripe = makeStripe(mode);

    const coupon = await stripe.coupons.create({
      name: name || undefined,
      percent_off,
      duration,
      ...(max_redemptions ? { max_redemptions } : {}),
    });

    let customerId: string | undefined;
    if (restrict_to_email) {
      const customers = await stripe.customers.list({ email: restrict_to_email, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      } else {
        const newCustomer = await stripe.customers.create({ email: restrict_to_email });
        customerId = newCustomer.id;
      }
    }

    const promoParams: Parameters<typeof stripe.promotionCodes.create>[0] = {
      coupon: coupon.id,
      ...(code ? { code } : {}),
      ...(max_redemptions ? { max_redemptions } : {}),
      ...(expires_at ? { expires_at: Math.floor(new Date(expires_at).getTime() / 1000) } : {}),
      ...(customerId ? { customer: customerId } : {}),
      restrictions: { first_time_transaction: first_time_only ?? false },
    };

    const promoCode = await stripe.promotionCodes.create(promoParams);

    logger.info({ couponId: coupon.id, promoCodeId: promoCode.id, code: promoCode.code }, "Coupon + promo code created");
    res.json({ ok: true, coupon, promoCode });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ err }, "Failed to create coupon");
    res.status(500).json({ error: msg });
  }
});

// ── DELETE /api/superadmin/coupons/:id — delete coupon ───────────────────────
router.delete("/coupons/:id", async (req: AuthRequest, res: Response) => {
  try {
    const mode = await getStripeMode();
    const stripe = makeStripe(mode);
    await stripe.coupons.del(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

// ── PATCH /api/superadmin/promo-codes/:id/deactivate ─────────────────────────
router.patch("/promo-codes/:id/deactivate", async (req: AuthRequest, res: Response) => {
  try {
    const mode = await getStripeMode();
    const stripe = makeStripe(mode);
    await stripe.promotionCodes.update(req.params.id, { active: false });
    res.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

export default router;
