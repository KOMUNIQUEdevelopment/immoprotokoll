import { Router, type Response } from "express";
import { eq, and, isNull, isNotNull, count } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { syncProtocolsTable, propertiesTable } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { getPlanLimits } from "./properties";

const router = Router();

// ── GET /api/protocols — list active protocols ────────────────────────────────
router.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  const accountId = req.user!.accountId;
  try {
    const rows = await db
      .select()
      .from(syncProtocolsTable)
      .where(and(
        eq(syncProtocolsTable.accountId, accountId),
        isNull(syncProtocolsTable.deletedAt)
      ));
    const protocols: Record<string, unknown> = {};
    for (const row of rows) {
      protocols[row.id] = row.data;
    }
    res.json({ protocols });
  } catch {
    res.status(500).json({ error: "Failed to load protocols" });
  }
});

// ── GET /api/protocols/trash — list trashed protocols ────────────────────────
// MUST be before /:id to avoid "trash" being treated as an id
router.get("/trash", requireAuth, async (req: AuthRequest, res: Response) => {
  const accountId = req.user!.accountId;
  try {
    const rows = await db
      .select()
      .from(syncProtocolsTable)
      .where(and(
        eq(syncProtocolsTable.accountId, accountId),
        isNotNull(syncProtocolsTable.deletedAt)
      ));
    const trash: Record<string, { protocol: unknown; deletedAt: string }> = {};
    for (const row of rows) {
      trash[row.id] = {
        protocol: row.data,
        deletedAt: row.deletedAt!.toISOString(),
      };
    }
    res.json({ trash });
  } catch {
    res.status(500).json({ error: "Failed to load trash" });
  }
});

// ── DELETE /api/protocols/trash — empty all trash ─────────────────────────────
// MUST be before DELETE /:id to avoid "trash" being treated as an id
router.delete("/trash", requireAuth, async (req: AuthRequest, res: Response) => {
  const accountId = req.user!.accountId;
  try {
    await db
      .delete(syncProtocolsTable)
      .where(and(
        eq(syncProtocolsTable.accountId, accountId),
        isNotNull(syncProtocolsTable.deletedAt)
      ));
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to empty trash" });
  }
});

// ── DELETE /api/protocols/trash/:id — permanently delete one trashed protocol ─
router.delete("/trash/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  const accountId = req.user!.accountId;
  const { id } = req.params;
  try {
    await db
      .delete(syncProtocolsTable)
      .where(and(
        eq(syncProtocolsTable.id, id),
        eq(syncProtocolsTable.accountId, accountId),
        isNotNull(syncProtocolsTable.deletedAt)
      ));
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to permanently delete protocol" });
  }
});

// ── POST /api/protocols/:id/restore — restore from trash ─────────────────────
router.post("/:id/restore", requireAuth, async (req: AuthRequest, res: Response) => {
  const accountId = req.user!.accountId;
  const { id } = req.params;
  try {
    await db
      .update(syncProtocolsTable)
      .set({ deletedAt: null, updatedAt: new Date() })
      .where(and(
        eq(syncProtocolsTable.id, id),
        eq(syncProtocolsTable.accountId, accountId),
        isNotNull(syncProtocolsTable.deletedAt)
      ));
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to restore protocol" });
  }
});

// ── POST /api/protocols — create new protocol ─────────────────────────────────
router.post("/", requireAuth, async (req: AuthRequest, res: Response) => {
  const accountId = req.user!.accountId;
  const { protocol } = req.body as { protocol?: Record<string, unknown> };
  if (!protocol || typeof protocol !== "object" || !protocol.id) {
    res.status(400).json({ error: "protocol.id is required" });
    return;
  }
  const id = protocol.id as string;
  const propertyId = (protocol.propertyId as string | undefined) ?? null;

  if (!propertyId) {
    res.status(400).json({ error: "propertyId is required for new protocols" });
    return;
  }

  const [propRow] = await db
    .select({ id: propertiesTable.id })
    .from(propertiesTable)
    .where(and(
      eq(propertiesTable.id, propertyId),
      eq(propertiesTable.accountId, accountId)
    ))
    .limit(1);
  if (!propRow) {
    res.status(404).json({ error: "Property not found" });
    return;
  }

  const { plan, limits } = await getPlanLimits(accountId);
  if (limits.protocolsPerProperty !== Infinity) {
    const [{ value: protocolCount }] = await db
      .select({ value: count() })
      .from(syncProtocolsTable)
      .where(and(
        eq(syncProtocolsTable.accountId, accountId),
        eq(syncProtocolsTable.propertyId, propertyId),
        isNull(syncProtocolsTable.deletedAt)
      ));
    if (protocolCount >= limits.protocolsPerProperty) {
      res.status(403).json({
        error: "PROTOCOL_LIMIT_EXCEEDED",
        message: `Plan limit: your ${plan} plan allows ${limits.protocolsPerProperty} protocol(s) per property.`,
      });
      return;
    }
  }

  try {
    await db.insert(syncProtocolsTable)
      .values({
        id,
        accountId,
        propertyId,
        data: protocol,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [syncProtocolsTable.accountId, syncProtocolsTable.id],
        set: { data: protocol, updatedAt: new Date() },
        setWhere: sql`${syncProtocolsTable.deletedAt} IS NULL`,
      });
    res.status(201).json({ ok: true, id });
  } catch {
    res.status(500).json({ error: "Failed to create protocol" });
  }
});

// ── PUT /api/protocols/:id — update protocol ──────────────────────────────────
router.put("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  const accountId = req.user!.accountId;
  const { id } = req.params;
  const { protocol } = req.body as { protocol?: Record<string, unknown> };
  if (!protocol || typeof protocol !== "object") {
    res.status(400).json({ error: "protocol body required" });
    return;
  }

  try {
    const [existing] = await db
      .select()
      .from(syncProtocolsTable)
      .where(and(
        eq(syncProtocolsTable.id, id),
        eq(syncProtocolsTable.accountId, accountId),
        isNull(syncProtocolsTable.deletedAt)
      ))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Protocol not found" });
      return;
    }

    // Preserve signatures stored server-side (never overwrite with stripped null)
    const existingData = existing.data as Record<string, unknown>;
    const existingSigs = (existingData.personSignatures ?? []) as Array<{ personId: string; signatureDataUrl: string | null }>;
    const incomingSigs = (protocol.personSignatures ?? []) as Array<{ personId: string; signatureDataUrl: string | null }>;

    if (existingSigs.length > 0 && incomingSigs.length > 0) {
      protocol.personSignatures = incomingSigs.map((sig) => {
        if (sig.signatureDataUrl) return sig;
        const kept = existingSigs.find(s => s.personId === sig.personId && s.signatureDataUrl);
        return kept ? { ...sig, signatureDataUrl: kept.signatureDataUrl } : sig;
      });
      for (const es of existingSigs) {
        if (es.signatureDataUrl && !incomingSigs.some(s => s.personId === es.personId)) {
          (protocol.personSignatures as typeof incomingSigs).push(es);
        }
      }
    }

    // Always keep the stored propertyId — clients cannot reassign
    protocol.propertyId = existing.propertyId;

    await db
      .update(syncProtocolsTable)
      .set({ data: protocol, updatedAt: new Date() })
      .where(and(
        eq(syncProtocolsTable.id, id),
        eq(syncProtocolsTable.accountId, accountId)
      ));

    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to update protocol" });
  }
});

// ── DELETE /api/protocols/:id — soft delete (move to trash) ──────────────────
router.delete("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  const accountId = req.user!.accountId;
  const { id } = req.params;
  try {
    await db
      .update(syncProtocolsTable)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(
        eq(syncProtocolsTable.id, id),
        eq(syncProtocolsTable.accountId, accountId),
        isNull(syncProtocolsTable.deletedAt)
      ));
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to delete protocol" });
  }
});

export default router;
