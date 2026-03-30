import { Router, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { db } from "@workspace/db";
import { accountsTable } from "@workspace/db";
import { requireAuth, requireRole, type AuthRequest } from "../middleware/auth";
import { logger } from "../lib/logger";

const router = Router();

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY;

function getStripe(): Stripe {
  if (!STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY not configured");
  return new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2026-03-25.dahlia" });
}

// ── Plan price definitions ─────────────────────────────────────────────────
// Prices are per plan × interval × currency. Stored as monthly amounts.
// Annual = monthly × 12 × 0.8 (20% discount).
export const PLAN_PRICES = {
  privat: { monthly: 9, annual: 9 * 12 * 0.8 },
  agentur: { monthly: 49, annual: 49 * 12 * 0.8 },
} as const;

// Stripe Price IDs come from env — one per plan × interval × currency combo
// Format: STRIPE_PRICE_{PLAN}_{INTERVAL}_{CURRENCY} (uppercase)
// e.g. STRIPE_PRICE_PRIVAT_MONTHLY_CHF
function getStripePriceId(
  plan: "privat" | "agentur",
  interval: "monthly" | "annual",
  currency: string
): string | undefined {
  const key = `STRIPE_PRICE_${plan.toUpperCase()}_${interval.toUpperCase()}_${currency.toUpperCase()}`;
  return process.env[key];
}

// ── GET /api/billing/config — return publishable key + plan prices ─────────
router.get("/config", async (_req: Request, res: Response) => {
  res.json({
    publishableKey: STRIPE_PUBLISHABLE_KEY ?? null,
    stripeEnabled: !!STRIPE_SECRET_KEY,
    plans: {
      privat: PLAN_PRICES.privat,
      agentur: PLAN_PRICES.agentur,
    },
  });
});

// ── GET /api/billing/subscription — current subscription state ────────────
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
    res.json(account);
  } catch (err) {
    logger.error({ err }, "Error fetching subscription");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/billing/checkout — create Stripe Checkout session ───────────
router.post(
  "/checkout",
  requireAuth,
  requireRole("owner"),
  async (req: AuthRequest, res: Response) => {
    if (!STRIPE_SECRET_KEY) {
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

    const priceId = getStripePriceId(
      plan as "privat" | "agentur",
      interval as "monthly" | "annual",
      cur
    );
    if (!priceId) {
      res.status(422).json({ error: `No Stripe price configured for ${plan}/${interval}/${cur}` });
      return;
    }

    try {
      const stripe = getStripe();
      const [account] = await db
        .select({ name: accountsTable.name, stripeCustomerId: accountsTable.stripeCustomerId })
        .from(accountsTable)
        .where(eq(accountsTable.id, accountId))
        .limit(1);

      if (!account) {
        res.status(404).json({ error: "Account not found" });
        return;
      }

      // Find or create Stripe customer
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

      const origin = req.headers.origin ?? req.headers.referer ?? "https://immoprotokoll.com";
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "subscription",
        currency: cur,
        success_url: `${origin}/#/billing/success`,
        cancel_url: `${origin}/#/billing/cancel`,
        metadata: { accountId, plan, interval: interval, currency: cur },
        subscription_data: {
          metadata: { accountId, plan, interval: interval, currency: cur },
        },
      });

      res.json({ url: session.url });
    } catch (err) {
      logger.error({ err }, "Error creating checkout session");
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  }
);

// ── POST /api/billing/portal — create Stripe Customer Portal session ──────
router.post(
  "/portal",
  requireAuth,
  requireRole("owner"),
  async (req: AuthRequest, res: Response) => {
    if (!STRIPE_SECRET_KEY) {
      res.status(503).json({ error: "Stripe not configured" });
      return;
    }

    const accountId = req.user!.accountId;
    try {
      const stripe = getStripe();
      const [account] = await db
        .select({ stripeCustomerId: accountsTable.stripeCustomerId })
        .from(accountsTable)
        .where(eq(accountsTable.id, accountId))
        .limit(1);

      if (!account?.stripeCustomerId) {
        res.status(404).json({ error: "No billing account found. Subscribe first." });
        return;
      }

      const origin = req.headers.origin ?? req.headers.referer ?? "https://immoprotokoll.com";
      const session = await stripe.billingPortal.sessions.create({
        customer: account.stripeCustomerId,
        return_url: `${origin}/#/billing`,
      });

      res.json({ url: session.url });
    } catch (err) {
      logger.error({ err }, "Error creating portal session");
      res.status(500).json({ error: "Failed to open billing portal" });
    }
  }
);

// ── POST /api/billing/webhook — Stripe webhook handler ────────────────────
// Must be registered with raw body parser (before express.json middleware).
router.post("/webhook", async (req: Request, res: Response) => {
  if (!STRIPE_WEBHOOK_SECRET || !STRIPE_SECRET_KEY) {
    res.status(503).json({ error: "Stripe not configured" });
    return;
  }

  const sig = req.headers["stripe-signature"] as string;
  let event: Stripe.Event;

  try {
    const stripe = getStripe();
    // req.body is a Buffer when raw body parser is used
    event = stripe.webhooks.constructEvent(req.body as Buffer, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn({ message }, "Webhook signature verification failed");
    res.status(400).json({ error: `Webhook error: ${message}` });
    return;
  }

  try {
    await handleWebhookEvent(event);
    res.json({ received: true });
  } catch (err) {
    logger.error({ err, type: event.type }, "Webhook handler error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Webhook event handler ─────────────────────────────────────────────────
async function handleWebhookEvent(event: Stripe.Event) {
  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      await syncSubscription(sub);
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      // Downgrade to free on subscription deletion
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
        logger.warn({ customerId }, "Invoice payment failed — marked past_due");
      }
      break;
    }
    default:
      logger.debug({ type: event.type }, "Unhandled webhook event");
  }
}

async function syncSubscription(sub: Stripe.Subscription) {
  const accountId = sub.metadata?.accountId;
  if (!accountId) {
    logger.warn({ subId: sub.id }, "Subscription missing accountId metadata");
    return;
  }

  const plan = (sub.metadata?.plan as "privat" | "agentur") ?? "free";
  const interval = (sub.metadata?.interval as "monthly" | "annual") ?? "monthly";
  const currency = sub.metadata?.currency ?? "chf";

  await db
    .update(accountsTable)
    .set({
      plan,
      stripeSubscriptionId: sub.id,
      subscriptionStatus: sub.status as "active" | "trialing" | "past_due" | "canceled" | "unpaid" | "incomplete",
      currentPeriodEnd: new Date((sub as Stripe.Subscription & { current_period_end: number }).current_period_end * 1000),
      billingInterval: interval,
      currency,
      updatedAt: new Date(),
    })
    .where(eq(accountsTable.id, accountId));

  logger.info({ accountId, plan, status: sub.status }, "Subscription synced");
}

export default router;
