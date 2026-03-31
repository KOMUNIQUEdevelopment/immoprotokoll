import { Router, type Response } from "express";
import { eq, and, count } from "drizzle-orm";
import { WebSocketServer, WebSocket } from "ws";
import { db } from "@workspace/db";
import { propertiesTable, syncProtocolsTable, accountsTable } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../middleware/auth";

const router = Router();

// Injected from index.ts after WSS is created, so we can broadcast delete events
let _wss: WebSocketServer | null = null;
export function setWss(wss: WebSocketServer) { _wss = wss; }

/** Broadcast a JSON message to all authenticated clients in the same account. */
function broadcastToAccount(accountId: string, payload: unknown) {
  if (!_wss) return;
  const msg = JSON.stringify(payload);
  _wss.clients.forEach((client) => {
    if (client.readyState !== WebSocket.OPEN) return;
    const c = client as WebSocket & { accountId?: string };
    if (c.accountId === accountId) client.send(msg);
  });
}

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
    .select({
      plan: accountsTable.plan,
      customMaxProperties: accountsTable.customMaxProperties,
      customMaxProtocols: accountsTable.customMaxProtocols,
    })
    .from(accountsTable)
    .where(eq(accountsTable.id, accountId))
    .limit(1);
  const row = rows[0];
  const plan = (row?.plan ?? "free") as Plan;
  const baseLimits = PLAN_LIMITS[plan];
  const limits = plan === "custom" ? {
    properties: row?.customMaxProperties ?? Infinity,
    protocolsPerProperty: row?.customMaxProtocols ?? Infinity,
  } : baseLimits;
  return { plan, limits };
}

// ── GET /api/properties/plan-limits — return current plan & limits ───────────
router.get("/plan-limits", requireAuth, async (req: AuthRequest, res: Response) => {
  const accountId = req.user!.accountId;
  try {
    const { plan, limits } = await getPlanLimits(accountId);
    const safeLimit = (n: number) => (n === Infinity ? null : n);
    res.json({
      plan,
      properties: safeLimit(limits.properties),
      protocolsPerProperty: safeLimit(limits.protocolsPerProperty),
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

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
  const { name, adresse, language } = req.body as { name?: string; adresse?: string; language?: string };
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

  const validLangs = ["de-CH", "de-DE", "en"];
  const resolvedLanguage = language && validLangs.includes(language) ? language : "de-CH";

  try {
    const [property] = await db
      .insert(propertiesTable)
      .values({ accountId, name: name.trim(), adresse: adresse?.trim() ?? "", language: resolvedLanguage })
      .returning();
    res.status(201).json(property);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── PATCH /api/properties/:id — update property fields (name, address, photo) ─
const updatePropertyHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = String(req.params.id);
  const { name, adresse, language, photoDataUrl } = req.body as {
    name?: string;
    adresse?: string;
    language?: string;
    photoDataUrl?: string;
  };

  // name is required only when not doing a photo-only update
  const isPhotoOnlyUpdate = photoDataUrl !== undefined && !name;
  if (!isPhotoOnlyUpdate && !name?.trim()) {
    res.status(400).json({ error: "name is required" });
    return;
  }

  const accountId = req.user!.accountId;
  const validLangs = ["de-CH", "de-DE", "en"];
  const resolvedLanguage = language && validLangs.includes(language) ? language : undefined;

  type PropertyUpdate = {
    name?: string;
    adresse?: string;
    language?: string;
    photoDataUrl?: string;
    updatedAt: Date;
  };
  const setFields: PropertyUpdate = { updatedAt: new Date() };
  if (name?.trim()) setFields.name = name.trim();
  if (adresse !== undefined) setFields.adresse = adresse.trim();
  if (resolvedLanguage) setFields.language = resolvedLanguage;
  if (photoDataUrl !== undefined) setFields.photoDataUrl = photoDataUrl;

  try {
    const [updated] = await db
      .update(propertiesTable)
      .set(setFields)
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
    // Fetch protocol IDs that will be cascade-deleted so we can broadcast removal
    // events to all connected clients in this account.
    const cascadedProtocols = await db
      .select({ id: syncProtocolsTable.id })
      .from(syncProtocolsTable)
      .where(
        and(
          eq(syncProtocolsTable.accountId, accountId),
          eq(syncProtocolsTable.propertyId, id)
        )
      );

    const [deleted] = await db
      .delete(propertiesTable)
      .where(and(eq(propertiesTable.id, id), eq(propertiesTable.accountId, accountId)))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Property not found" });
      return;
    }

    // Notify all connected clients to remove the cascaded protocols from local state
    for (const { id: protocolId } of cascadedProtocols) {
      broadcastToAccount(accountId, { type: "delete", id: protocolId });
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
