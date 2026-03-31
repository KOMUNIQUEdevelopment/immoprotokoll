import { Router, type Request, type Response } from "express";
import { count, eq } from "drizzle-orm";
import Stripe from "stripe";
import { db } from "@workspace/db";
import {
  accountsTable,
  subscriptionsTable,
  propertiesTable,
  syncProtocolsTable,
  stripeSettingsTable,
} from "@workspace/db";
import { requireAuth, requireRole, type AuthRequest } from "../middleware/auth";
import { logger } from "../lib/logger";

const router = Router();

const APP_BASE_URL = process.env.APP_BASE_URL ?? "https://immoprotokoll.com";

// ── Mode helpers ──────────────────────────────────────────────────────────────
export async function getStripeMode(): Promise<"live" | "test"> {
  try {
    const [row] = await db
      .select({ value: stripeSettingsTable.value })
      .from(stripeSettingsTable)
      .where(eq(stripeSettingsTable.key, "mode"))
      .limit(1);
    return row?.value === "test" ? "test" : "live";
  } catch {
    return "live";
  }
}

function getStripeSecretKey(mode: "live" | "test"): string | undefined {
  return mode === "test"
    ? process.env.STRIPE_SECRET_KEY_TEST
    : process.env.STRIPE_SECRET_KEY;
}

function getStripePublishableKey(mode: "live" | "test"): string | undefined {
  return mode === "test"
    ? process.env.STRIPE_PUBLISHABLE_KEY_TEST
    : process.env.STRIPE_PUBLISHABLE_KEY;
}

function getStripeWebhookSecret(mode: "live" | "test"): string | undefined {
  return mode === "test"
    ? process.env.STRIPE_WEBHOOK_SECRET_TEST
    : process.env.STRIPE_WEBHOOK_SECRET;
}

function makeStripe(mode: "live" | "test"): Stripe {
  const key = getStripeSecretKey(mode);
  if (!key) throw new Error(`Stripe ${mode} secret key not configured`);
  return new Stripe(key, { apiVersion: "2026-03-25.dahlia" });
}

// ── Plan price definitions ────────────────────────────────────────────────────
export const PLAN_PRICES = {
  privat:  { monthly: 9,  annual: 86.40 },
  agentur: { monthly: 49, annual: 470.40 },
} as const;

// Live price IDs come from env; test price IDs from DB (written by setup-test endpoint)
async function getStripePriceId(
  plan: "privat" | "agentur",
  interval: "monthly" | "annual",
  currency: string,
  mode: "live" | "test"
): Promise<string | undefined> {
  const suffix = `${plan.toUpperCase()}_${interval.toUpperCase()}_${currency.toUpperCase()}`;
  if (mode === "live") {
    return process.env[`STRIPE_PRICE_${suffix}`];
  }
  const [row] = await db
    .select({ value: stripeSettingsTable.value })
    .from(stripeSettingsTable)
    .where(eq(stripeSettingsTable.key, `test_price_${suffix.toLowerCase()}`))
    .limit(1);
  return row?.value;
}

type PlanInfo = { plan: "privat" | "agentur"; interval: "monthly" | "annual"; currency: string };

async function buildPriceIdLookup(mode: "live" | "test"): Promise<Map<string, PlanInfo>> {
  const lookup = new Map<string, PlanInfo>();
  const plans = ["privat", "agentur"] as const;
  const intervals = ["monthly", "annual"] as const;
  const currencies = ["chf", "eur", "usd"] as const;
  await Promise.all(
    plans.flatMap((plan) =>
      intervals.flatMap((interval) =>
        currencies.map(async (currency) => {
          const priceId = await getStripePriceId(plan, interval, currency, mode);
          if (priceId) lookup.set(priceId, { plan, interval, currency });
        })
      )
    )
  );
  return lookup;
}

// ── GET /api/billing/config ───────────────────────────────────────────────────
router.get("/config", async (_req: Request, res: Response) => {
  const mode = await getStripeMode();
  res.json({
    publishableKey: getStripePublishableKey(mode) ?? null,
    stripeEnabled: !!getStripeSecretKey(mode),
    stripeMode: mode,
    plans: {
      privat: PLAN_PRICES.privat,
      agentur: PLAN_PRICES.agentur,
    },
  });
});

// ── GET /api/billing/subscription ────────────────────────────────────────────
router.get("/subscription", requireAuth, async (req: AuthRequest, res: Response) => {
  const accountId = req.user!.accountId;
  try {
    const [account] = await db
      .select({
        plan: accountsTable.plan,
        currency: accountsTable.currency,
        billingInterval: accountsTable.billingInterval,
        subscriptionStatus: accountsTable.subscriptionStatus,
        currentPeriodEnd: accountsTable.currentPeriodEnd,
        stripeCustomerId: accountsTable.stripeCustomerId,
        stripeSubscriptionId: accountsTable.stripeSubscriptionId,
      })
      .from(accountsTable)
      .where(eq(accountsTable.id, accountId))
      .limit(1);

    if (!account) {
      res.status(404).json({ error: "Account not found" });
      return;
    }

    const [propCount] = await db
      .select({ value: count() })
      .from(propertiesTable)
      .where(eq(propertiesTable.accountId, accountId));
    const [protCount] = await db
      .select({ value: count() })
      .from(syncProtocolsTable)
      .where(eq(syncProtocolsTable.accountId, accountId));

    const LIMITS: Record<string, { properties: number | null; protocols: number | null }> = {
      free:    { properties: 1,    protocols: 1 },
      privat:  { properties: 1,    protocols: 30 },
      agentur: { properties: 50,   protocols: 30 },
      custom:  { properties: null, protocols: null },
    };
    const limits = LIMITS[account.plan] ?? LIMITS.free;

    res.json({
      ...account,
      usage: {
        properties: propCount?.value ?? 0,
        protocols: protCount?.value ?? 0,
        limits,
      },
    });
  } catch (err) {
    logger.error({ err }, "Error fetching subscription");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/billing/checkout ────────────────────────────────────────────────
router.post(
  "/checkout",
  requireAuth,
  requireRole("owner"),
  async (req: AuthRequest, res: Response) => {
    const mode = await getStripeMode();
    if (!getStripeSecretKey(mode)) {
      res.status(503).json({ error: "Stripe not configured" });
      return;
    }

    const accountId = req.user!.accountId;
    const { plan, interval, currency } = req.body as {
      plan?: string;
      interval?: string;
      currency?: string;
    };

    if (!plan || !["privat", "agentur"].includes(plan)) {
      res.status(400).json({ error: "Invalid plan" });
      return;
    }
    if (!interval || !["monthly", "annual"].includes(interval)) {
      res.status(400).json({ error: "Invalid billing interval" });
      return;
    }
    const cur = (currency ?? "chf").toLowerCase();
    if (!["chf", "eur", "usd"].includes(cur)) {
      res.status(400).json({ error: "Invalid currency" });
      return;
    }

    const priceId = await getStripePriceId(
      plan as "privat" | "agentur",
      interval as "monthly" | "annual",
      cur,
      mode
    );
    if (!priceId) {
      res.status(422).json({
        error: `No Stripe price configured for ${plan}/${interval}/${cur} (mode: ${mode})`,
      });
      return;
    }

    try {
      const stripe = makeStripe(mode);
      const [account] = await db
        .select({ name: accountsTable.name, stripeCustomerId: accountsTable.stripeCustomerId })
        .from(accountsTable)
        .where(eq(accountsTable.id, accountId))
        .limit(1);

      if (!account) {
        res.status(404).json({ error: "Account not found" });
        return;
      }

      let customerId = account.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          name: account.name,
          email: req.user!.email,
          metadata: { accountId },
        });
        customerId = customer.id;
        await db
          .update(accountsTable)
          .set({ stripeCustomerId: customerId, updatedAt: new Date() })
          .where(eq(accountsTable.id, accountId));
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "subscription",
        currency: cur,
        success_url: `${APP_BASE_URL}/app/#/billing/success`,
        cancel_url: `${APP_BASE_URL}/app/#/billing/cancel`,
        metadata: { accountId, plan, interval, currency: cur },
        subscription_data: {
          metadata: { accountId, plan, interval, currency: cur },
        },
      });

      res.json({ url: session.url });
    } catch (err) {
      logger.error({ err }, "Error creating checkout session");
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  }
);

// ── POST /api/billing/portal ──────────────────────────────────────────────────
router.post(
  "/portal",
  requireAuth,
  requireRole("owner"),
  async (req: AuthRequest, res: Response) => {
    const mode = await getStripeMode();
    if (!getStripeSecretKey(mode)) {
      res.status(503).json({ error: "Stripe not configured" });
      return;
    }

    const accountId = req.user!.accountId;
    try {
      const stripe = makeStripe(mode);
      const [account] = await db
        .select({ stripeCustomerId: accountsTable.stripeCustomerId })
        .from(accountsTable)
        .where(eq(accountsTable.id, accountId))
        .limit(1);

      if (!account?.stripeCustomerId) {
        res.status(404).json({ error: "No billing account found. Subscribe first." });
        return;
      }

      const session = await stripe.billingPortal.sessions.create({
        customer: account.stripeCustomerId,
        return_url: `${APP_BASE_URL}/app/#/billing`,
      });

      res.json({ url: session.url });
    } catch (err) {
      logger.error({ err }, "Error creating portal session");
      res.status(500).json({ error: "Failed to open billing portal" });
    }
  }
);

// ── POST /api/billing/webhook ─────────────────────────────────────────────────
router.post("/webhook", async (req: Request, res: Response) => {
  const mode = await getStripeMode();
  const webhookSecret = getStripeWebhookSecret(mode);
  const secretKey = getStripeSecretKey(mode);

  if (!webhookSecret || !secretKey) {
    res.status(503).json({ error: "Stripe not configured" });
    return;
  }

  const sig = req.headers["stripe-signature"] as string;
  let event: Stripe.Event;

  try {
    const stripe = makeStripe(mode);
    event = stripe.webhooks.constructEvent(req.body as Buffer, sig, webhookSecret);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn({ message }, "Webhook signature verification failed");
    res.status(400).json({ error: `Webhook error: ${message}` });
    return;
  }

  try {
    const priceIdLookup = await buildPriceIdLookup(mode);
    await handleWebhookEvent(event, priceIdLookup);
    res.json({ received: true });
  } catch (err) {
    logger.error({ err, type: event.type }, "Webhook handler error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Webhook event handler ─────────────────────────────────────────────────────
async function handleWebhookEvent(event: Stripe.Event, priceIdLookup: Map<string, PlanInfo>) {
  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      await syncSubscription(sub, priceIdLookup);
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const accountId = sub.metadata?.accountId;
      if (accountId) {
        await db
          .update(accountsTable)
          .set({
            plan: "free",
            stripeSubscriptionId: null,
            subscriptionStatus: "canceled",
            currentPeriodEnd: null,
            updatedAt: new Date(),
          })
          .where(eq(accountsTable.id, accountId));
        await db
          .update(subscriptionsTable)
          .set({ status: "canceled", canceledAt: new Date(), updatedAt: new Date() })
          .where(eq(subscriptionsTable.accountId, accountId));
        logger.info({ accountId }, "Subscription canceled — downgraded to free");
      }
      break;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;
      if (customerId) {
        await db
          .update(accountsTable)
          .set({ subscriptionStatus: "past_due", updatedAt: new Date() })
          .where(eq(accountsTable.stripeCustomerId, customerId));
        await db
          .update(subscriptionsTable)
          .set({ status: "past_due", updatedAt: new Date() })
          .where(eq(subscriptionsTable.stripeCustomerId, customerId));
        logger.warn({ customerId }, "Invoice payment failed — marked past_due");
      }
      break;
    }
    default:
      logger.debug({ type: event.type }, "Unhandled webhook event");
  }
}

async function syncSubscription(sub: Stripe.Subscription, priceIdLookup: Map<string, PlanInfo>) {
  const accountId = sub.metadata?.accountId;
  if (!accountId) {
    logger.warn({ subId: sub.id }, "Subscription missing accountId metadata");
    return;
  }

  const firstPriceId = sub.items?.data?.[0]?.price?.id;
  const fromPriceId = firstPriceId ? priceIdLookup.get(firstPriceId) : undefined;

  const plan = (fromPriceId?.plan
    ?? sub.metadata?.plan as "privat" | "agentur" | undefined
    ?? "free") as "free" | "privat" | "agentur";
  const interval = (fromPriceId?.interval
    ?? sub.metadata?.interval as "monthly" | "annual" | undefined
    ?? "monthly");
  const currency = fromPriceId?.currency ?? sub.metadata?.currency ?? "chf";

  const stripeStatus = sub.status as "active" | "trialing" | "past_due" | "canceled" | "unpaid" | "incomplete";
  const periodEnd = new Date((sub as Stripe.Subscription & { current_period_end: number }).current_period_end * 1000);
  const periodStart = new Date((sub as Stripe.Subscription & { current_period_start: number }).current_period_start * 1000);

  await db
    .update(accountsTable)
    .set({
      plan,
      stripeSubscriptionId: sub.id,
      subscriptionStatus: stripeStatus,
      currentPeriodEnd: periodEnd,
      billingInterval: interval,
      currency,
      updatedAt: new Date(),
    })
    .where(eq(accountsTable.id, accountId));

  const existing = await db
    .select({ id: subscriptionsTable.id })
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.accountId, accountId))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(subscriptionsTable)
      .set({
        stripeSubscriptionId: sub.id,
        stripeCustomerId: sub.customer as string,
        plan,
        billingInterval: interval,
        currency,
        status: stripeStatus,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        updatedAt: new Date(),
      })
      .where(eq(subscriptionsTable.accountId, accountId));
  } else {
    await db.insert(subscriptionsTable).values({
      accountId,
      stripeSubscriptionId: sub.id,
      stripeCustomerId: sub.customer as string,
      plan,
      billingInterval: interval,
      currency,
      status: stripeStatus,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
    });
  }

  logger.info({ accountId, plan, status: sub.status }, "Subscription synced");
}

export default router;
