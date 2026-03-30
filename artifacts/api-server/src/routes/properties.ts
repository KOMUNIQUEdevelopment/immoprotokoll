import { Router, type Response } from "express";
import { eq, and, count } from "drizzle-orm";
import { db } from "@workspace/db";
import { propertiesTable, syncProtocolsTable, accountsTable } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../middleware/auth";

const router = Router();

// ── Plan limits ───────────────────────────────────────────────────────────────
export const PLAN_LIMITS = {
  free:    { properties: 1,        protocolsPerProperty: 1 },
  privat:  { properties: 1,        protocolsPerProperty: 30 },
  agentur: { properties: 50,       protocolsPerProperty: 30 },
  custom:  { properties: Infinity, protocolsPerProperty: Infinity },
} as const;

export type Plan = keyof typeof PLAN_LIMITS;

export async function getPlanLimits(accountId: string) {
  const rows = await db
    .select({ plan: accountsTable.plan })
    .from(accountsTable)
    .where(eq(accountsTable.id, accountId))
    .limit(1);
  const plan = (rows[0]?.plan ?? "free") as Plan;
  return { plan, limits: PLAN_LIMITS[plan] };
}

// ── GET /api/properties — list all properties for the authenticated account ───
router.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  const accountId = req.user!.accountId;
  try {
    const properties = await db
      .select()
      .from(propertiesTable)
      .where(eq(propertiesTable.accountId, accountId))
      .orderBy(propertiesTable.createdAt);
    res.json(properties);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/properties — create a new property ─────────────────────────────
router.post("/", requireAuth, async (req: AuthRequest, res: Response) => {
  const { name, adresse } = req.body as { name?: string; adresse?: string };
  if (!name?.trim()) {
    res.status(400).json({ error: "name is required" });
    return;
  }

  const accountId = req.user!.accountId;
  const { plan, limits } = await getPlanLimits(accountId);

  if (limits.properties !== Infinity) {
    const [{ value: propertyCount }] = await db
      .select({ value: count() })
      .from(propertiesTable)
      .where(eq(propertiesTable.accountId, accountId));
    if (propertyCount >= limits.properties) {
      res.status(403).json({
        error: `Plan limit reached: your ${plan} plan allows ${limits.properties} property/properties.`,
        code: "PROPERTY_LIMIT_EXCEEDED",
        plan,
        limit: limits.properties,
      });
      return;
    }
  }

  try {
    const [property] = await db
      .insert(propertiesTable)
      .values({ accountId, name: name.trim(), adresse: adresse?.trim() ?? "" })
      .returning();
    res.status(201).json(property);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── PATCH /api/properties/:id — update property name/address ─────────────────
const updatePropertyHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = String(req.params.id);
  const { name, adresse } = req.body as { name?: string; adresse?: string };

  if (!name?.trim()) {
    res.status(400).json({ error: "name is required" });
    return;
  }

  const accountId = req.user!.accountId;

  try {
    const [updated] = await db
      .update(propertiesTable)
      .set({ name: name.trim(), adresse: adresse?.trim() ?? "", updatedAt: new Date() })
      .where(and(eq(propertiesTable.id, id), eq(propertiesTable.accountId, accountId)))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Property not found" });
      return;
    }
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};

router.put("/:id", requireAuth, updatePropertyHandler);
router.patch("/:id", requireAuth, updatePropertyHandler);

// ── DELETE /api/properties/:id — remove property + cascade protocols ──────────
router.delete("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id);
  const accountId = req.user!.accountId;

  const role = req.user!.role;
  if (role === "property_manager") {
    res.status(403).json({ error: "Property managers cannot delete properties" });
    return;
  }

  try {
    const [deleted] = await db
      .delete(propertiesTable)
      .where(and(eq(propertiesTable.id, id), eq(propertiesTable.accountId, accountId)))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Property not found" });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /api/properties/:id/protocols — list protocols for a property ─────────
router.get("/:id/protocols", requireAuth, async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id);
  const accountId = req.user!.accountId;

  try {
    // Verify property belongs to account
    const [property] = await db
      .select()
      .from(propertiesTable)
      .where(and(eq(propertiesTable.id, id), eq(propertiesTable.accountId, accountId)))
      .limit(1);

    if (!property) {
      res.status(404).json({ error: "Property not found" });
      return;
    }

    const protocols = await db
      .select({ id: syncProtocolsTable.id, data: syncProtocolsTable.data, updatedAt: syncProtocolsTable.updatedAt })
      .from(syncProtocolsTable)
      .where(
        and(
          eq(syncProtocolsTable.accountId, accountId),
          eq(syncProtocolsTable.propertyId, id)
        )
      )
      .orderBy(syncProtocolsTable.updatedAt);

    res.json({ protocols });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
