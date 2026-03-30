import { createServer, type IncomingMessage } from "http";
import { WebSocketServer, WebSocket } from "ws";
import express from "express";
import { eq, and, count } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  sessionsTable,
  usersTable,
  syncProtocolsTable,
  syncPhotosTable,
  propertiesTable,
} from "@workspace/db";
import { getPlanLimits } from "./routes/properties";
import { requireAuth, type AuthRequest } from "./middleware/auth";
import app from "./app";
import { logger } from "./lib/logger";
import { initSuperAdmin } from "./lib/init";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const SESSION_COOKIE = "immo_session";
const MAX_PAYLOAD = 50 * 1024 * 1024;

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  return Object.fromEntries(
    cookieHeader.split(";").map((c) => {
      const idx = c.indexOf("=");
      if (idx < 0) return [c.trim(), ""] as [string, string];
      return [c.slice(0, idx).trim(), c.slice(idx + 1).trim()] as [string, string];
    })
  );
}

interface ResolvedSession {
  accountId: string;
  role: "owner" | "administrator" | "property_manager";
}

async function resolveSessionFromRequest(
  request: IncomingMessage
): Promise<ResolvedSession | null> {
  const cookies = parseCookies(request.headers.cookie);
  const sessionId = cookies[SESSION_COOKIE];
  if (!sessionId) return null;

  const sessions = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.id, sessionId))
    .limit(1);

  const session = sessions[0];
  if (!session || session.expiresAt < new Date()) return null;

  const users = await db
    .select({ accountId: usersTable.accountId, role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, session.userId))
    .limit(1);

  const u = users[0];
  if (!u) return null;
  return { accountId: u.accountId, role: u.role };
}

const server = createServer(app);
const wss = new WebSocketServer({ noServer: true });

// Extended request type for WS connection metadata
type AugmentedRequest = IncomingMessage & {
  accountId?: string;
  userRole?: "owner" | "administrator" | "property_manager";
  tenantProtocolId?: string; // set for unauthenticated tenant observers
};

server.on("upgrade", async (request, socket, head) => {
  // Strip query string to check path only
  const parsedUrl = new URL(request.url ?? "", "http://localhost");
  if (parsedUrl.pathname !== "/api/sync") {
    socket.destroy();
    return;
  }

  const session = await resolveSessionFromRequest(request);
  const ext = request as AugmentedRequest;

  if (session) {
    // Authenticated user — attach account + role
    ext.accountId = session.accountId;
    ext.userRole = session.role;
  } else {
    // No session — check for tenant observer mode (read-only per protocolId)
    const protocolId = parsedUrl.searchParams.get("protocolId");
    if (!protocolId) {
      socket.write("HTTP/1.1 401 Unauthorized\r\nContent-Length: 0\r\n\r\n");
      socket.destroy();
      return;
    }
    ext.tenantProtocolId = protocolId;
  }

  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request);
  });
});

// Extended WS type with connection metadata
type AugmentedWs = WebSocket & {
  accountId?: string;
  userRole?: "owner" | "administrator" | "property_manager";
  tenantProtocolId?: string;
};

wss.on("connection", async (ws, request) => {
  const ext = request as AugmentedRequest;
  const accountId = ext.accountId;
  const userRole = ext.userRole;
  const tenantProtocolId = ext.tenantProtocolId;
  const isTenant = !accountId && !!tenantProtocolId;

  // Attach metadata to the WS socket for broadcast filtering
  const augWs = ws as AugmentedWs;
  augWs.accountId = accountId;
  augWs.userRole = userRole;
  augWs.tenantProtocolId = tenantProtocolId;

  logger.info({ clients: wss.clients.size, accountId, tenantProtocolId, isTenant }, "WebSocket client connected");

  if (isTenant) {
    // Tenant observer — send only the one protocol they requested
    try {
      const rows = await db
        .select()
        .from(syncProtocolsTable)
        .where(eq(syncProtocolsTable.id, tenantProtocolId!))
        .limit(1);

      if (rows.length > 0) {
        ws.send(JSON.stringify({ type: "init", protocols: { [tenantProtocolId!]: rows[0].data } }));
      }
    } catch (err) {
      logger.error({ err }, "Failed to load protocol for tenant WS init");
    }
  } else {
    // Authenticated user — send all protocols for their account
    try {
      const rows = await db
        .select()
        .from(syncProtocolsTable)
        .where(eq(syncProtocolsTable.accountId, accountId!));

      const protocols: Record<string, unknown> = {};
      for (const row of rows) {
        protocols[row.id] = row.data;
      }
      ws.send(JSON.stringify({ type: "init", protocols }));
    } catch (err) {
      logger.error({ err }, "Failed to load protocols for WS init");
    }
  }

  ws.on("message", async (data) => {
    // Tenant observers are read-only — ignore all messages they send
    if (isTenant) return;

    const payload = data.toString();
    if (payload.length > MAX_PAYLOAD) {
      logger.warn("Payload too large, ignoring");
      return;
    }

    let msg: { type: string; protocol?: { id: string }; id?: string };
    try {
      msg = JSON.parse(payload);
    } catch {
      return;
    }

    if (msg.type === "update" && msg.protocol && msg.protocol.id) {
      const incoming = msg.protocol as {
        id: string;
        propertyId?: string | null;
        personSignatures?: Array<{ personId: string; signatureDataUrl: string | null }>;
      };

      try {
        const existingRows = await db
          .select()
          .from(syncProtocolsTable)
          .where(
            and(
              eq(syncProtocolsTable.id, incoming.id),
              eq(syncProtocolsTable.accountId, accountId!)
            )
          )
          .limit(1);

        const existingRow = existingRows[0];
        const existing = existingRow?.data as typeof incoming | undefined;
        const isNew = !existingRow;
        // The DB-stored propertyId is the authoritative value for existing protocols.
        // Clients cannot reassign a protocol to a different property after creation.
        const storedPropertyId = existingRow?.propertyId ?? null;

        // New protocols MUST be associated with a property.
        // Updates to existing protocols (including legacy ones without propertyId) are still accepted.
        if (isNew && !incoming.propertyId) {
          ws.send(JSON.stringify({
            type: "error",
            code: "PROPERTY_REQUIRED",
            message: "New protocols must be associated with a property.",
          }));
          return;
        }

        // Determine the effective propertyId for this upsert.
        // For new protocols: use the incoming propertyId (validated below).
        // For updates: use the stored value. Exception: a legacy protocol (storedPropertyId=null)
        // may have its propertyId set once (first-time assignment / migration).
        let effectivePropertyId: string | null;
        if (isNew) {
          effectivePropertyId = incoming.propertyId ?? null;
        } else if (storedPropertyId !== null) {
          // Property already set — the client cannot change it.
          effectivePropertyId = storedPropertyId;
        } else {
          // Legacy protocol (storedPropertyId = null): allow first-time assignment,
          // but validate the new propertyId belongs to this account.
          effectivePropertyId = incoming.propertyId ?? null;
        }

        // Verify the property belongs to the same account (for new protocols and first-time assignment).
        if (effectivePropertyId && (isNew || storedPropertyId === null)) {
          const [propRow] = await db
            .select({ id: propertiesTable.id })
            .from(propertiesTable)
            .where(and(
              eq(propertiesTable.id, effectivePropertyId),
              eq(propertiesTable.accountId, accountId!)
            ))
            .limit(1);
          if (!propRow) {
            ws.send(JSON.stringify({
              type: "error",
              code: "PROPERTY_NOT_FOUND",
              message: "The specified property does not belong to your account.",
            }));
            return;
          }
        }

        // Plan limit check for new protocols: count existing protocols for this property
        if (isNew && effectivePropertyId) {
          const { plan, limits } = await getPlanLimits(accountId!);
          if (limits.protocolsPerProperty !== Infinity) {
            const [{ value: protocolCount }] = await db
              .select({ value: count() })
              .from(syncProtocolsTable)
              .where(
                and(
                  eq(syncProtocolsTable.accountId, accountId!),
                  eq(syncProtocolsTable.propertyId, effectivePropertyId)
                )
              );
            if (protocolCount >= limits.protocolsPerProperty) {
              ws.send(JSON.stringify({
                type: "error",
                code: "PROTOCOL_LIMIT_EXCEEDED",
                message: `Plan limit: your ${plan} plan allows ${limits.protocolsPerProperty} protocol(s) per property.`,
              }));
              return;
            }
          }
        }

        // Preserve non-empty signatures that were already on the server
        if (existing?.personSignatures?.length && incoming.personSignatures) {
          incoming.personSignatures = incoming.personSignatures.map((sig) => {
            if (sig.signatureDataUrl) return sig;
            const kept = existing.personSignatures!.find(
              (s) => s.personId === sig.personId && s.signatureDataUrl
            );
            return kept ? { ...sig, signatureDataUrl: kept.signatureDataUrl } : sig;
          });
          for (const es of existing.personSignatures) {
            if (
              es.signatureDataUrl &&
              !incoming.personSignatures.some((s) => s.personId === es.personId)
            ) {
              incoming.personSignatures.push(es);
            }
          }
        }

        // Upsert to DB — conflict target is composite (account_id, id) so
        // a different account using the same UUID cannot overwrite this row.
        // effectivePropertyId is used (not incoming.propertyId) to ensure the server
        // is the authoritative source for property binding — clients cannot remap protocols.
        await db
          .insert(syncProtocolsTable)
          .values({
            id: incoming.id,
            accountId: accountId!,
            propertyId: effectivePropertyId,
            data: incoming as unknown as Record<string, unknown>,
          })
          .onConflictDoUpdate({
            target: [syncProtocolsTable.accountId, syncProtocolsTable.id],
            set: {
              propertyId: effectivePropertyId,
              data: incoming as unknown as Record<string, unknown>,
              updatedAt: new Date(),
            },
          });

        logger.info({ id: incoming.id, accountId }, "Protocol updated");

        const broadcastPayload = JSON.stringify({ type: "update", protocol: incoming });
        wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            const c = client as AugmentedWs;
            // Broadcast to other authenticated clients in the same account
            if (c.accountId === accountId) client.send(broadcastPayload);
            // Also broadcast to tenant observers watching this specific protocol
            if (c.tenantProtocolId === incoming.id) client.send(broadcastPayload);
          }
        });
      } catch (err) {
        logger.error({ err }, "Failed to update protocol");
      }
    } else if (msg.type === "delete" && msg.id) {
      // Only Owner or Administrator may delete protocols — property managers cannot
      if (userRole === "property_manager") {
        logger.warn({ userRole }, "Property manager attempted to delete protocol — denied");
        return;
      }

      try {
        await db
          .delete(syncProtocolsTable)
          .where(
            and(
              eq(syncProtocolsTable.id, msg.id),
              eq(syncProtocolsTable.accountId, accountId!)
            )
          );

        logger.info({ id: msg.id, accountId }, "Protocol deleted");

        const deleteBroadcast = JSON.stringify({ type: "delete", id: msg.id });
        wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            const c = client as AugmentedWs;
            if (c.accountId === accountId) client.send(deleteBroadcast);
          }
        });
      } catch (err) {
        logger.error({ err }, "Failed to delete protocol");
      }
    }
  });

  ws.on("close", () => {
    logger.info({ clients: wss.clients.size }, "WebSocket client disconnected");
  });

  ws.on("error", (err) => {
    logger.error({ err }, "WebSocket error");
  });

  (ws as WebSocket & { accountId?: string }).accountId = accountId;
});

// ── REST: Protokoll lesen (öffentlich für Mieter-Ansicht via UUID-Link) ───────
// Protocol IDs are UUIDs and are enforced globally unique in the DB schema
// (sync_protocols_id_unique constraint), so querying by id alone is safe.
app.get("/api/protocol/:id", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(syncProtocolsTable)
      .where(eq(syncProtocolsTable.id, req.params.id))
      .limit(1);

    if (rows.length === 0) {
      res.status(404).json({ error: "Protokoll nicht gefunden" });
      return;
    }
    res.json({ protocol: rows[0].data });
  } catch (err) {
    logger.error({ err }, "Failed to fetch protocol");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── REST: Unterschrift eintragen (öffentlich für Mieter) ─────────────────────
app.post("/api/protocol/:id/sign", async (req, res) => {
  const { id } = req.params;
  const { personId, signatureDataUrl } = req.body as {
    personId?: string;
    signatureDataUrl?: string;
  };

  if (!personId || !signatureDataUrl) {
    res.status(400).json({ error: "personId und signatureDataUrl erforderlich" });
    return;
  }

  try {
    const rows = await db
      .select()
      .from(syncProtocolsTable)
      .where(eq(syncProtocolsTable.id, id))
      .limit(1);

    if (rows.length === 0) {
      res.status(404).json({ error: "Protokoll nicht gefunden" });
      return;
    }

    const protocol = rows[0].data as Record<string, unknown> & {
      personSignatures?: Array<{ personId: string; signatureDataUrl: string | null }>;
    };

    const sigs = Array.isArray(protocol.personSignatures)
      ? [...protocol.personSignatures]
      : [];
    const idx = sigs.findIndex((s) => s.personId === personId);
    if (idx >= 0) {
      sigs[idx] = { ...sigs[idx], signatureDataUrl };
    } else {
      sigs.push({ personId, signatureDataUrl });
    }
    protocol.personSignatures = sigs;

    // Use the full composite PK (accountId + id) for the update to guarantee
    // exactly one row is targeted — even though id is globally unique in the schema,
    // this makes the intent explicit and safe against future schema changes.
    await db
      .update(syncProtocolsTable)
      .set({ data: protocol, updatedAt: new Date() })
      .where(
        and(
          eq(syncProtocolsTable.accountId, rows[0].accountId),
          eq(syncProtocolsTable.id, id)
        )
      );

    const broadcastPayload = JSON.stringify({ type: "update", protocol });
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        const c = client as AugmentedWs;
        // Broadcast to authenticated users in the same account
        if (c.accountId === rows[0].accountId) client.send(broadcastPayload);
        // Also broadcast to tenant observers watching this protocol
        if (c.tenantProtocolId === id) client.send(broadcastPayload);
      }
    });

    logger.info({ id, personId }, "Tenant signature saved and broadcast");
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "Failed to save signature");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── REST: Fotos abrufen für Mieter-Ansicht (öffentlich, scoped auf Protokoll) ─
// Returns only photos that are referenced in the given protocol's rooms/meterPhotos.
// This prevents tenants from using this endpoint to fish for arbitrary photo IDs.
app.get("/api/protocol/:id/photos", async (req, res) => {
  const { id } = req.params;
  const raw = (req.query.ids as string) || "";
  const requestedIds = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (requestedIds.length === 0) {
    res.json({ photos: {} });
    return;
  }

  try {
    const rows = await db
      .select()
      .from(syncProtocolsTable)
      .where(eq(syncProtocolsTable.id, id))
      .limit(1);

    if (rows.length === 0) {
      res.status(404).json({ error: "Protokoll nicht gefunden" });
      return;
    }

    const protocol = rows[0].data as Record<string, unknown>;
    const accountId = rows[0].accountId;

    // Collect all photo IDs referenced in the protocol (rooms + meter/kitchen photos)
    const allowedIds = new Set<string>();
    const addPhotos = (arr: unknown) => {
      if (Array.isArray(arr)) {
        for (const photo of arr as Array<{ id?: string }>) {
          if (photo.id) allowedIds.add(photo.id);
        }
      }
    };
    addPhotos(protocol.meterPhotos);
    addPhotos(protocol.kitchenPhotos);
    if (Array.isArray(protocol.rooms)) {
      for (const room of protocol.rooms as Array<{ photos?: unknown }>) {
        addPhotos(room.photos);
      }
    }

    // Only serve photos that are both requested AND referenced in this protocol
    const idsToFetch = requestedIds.filter((photoId) => allowedIds.has(photoId));
    if (idsToFetch.length === 0) {
      res.json({ photos: {} });
      return;
    }

    const photoRows = await db
      .select()
      .from(syncPhotosTable)
      .where(eq(syncPhotosTable.accountId, accountId));

    const result: Record<string, string> = {};
    for (const row of photoRows) {
      if (idsToFetch.includes(row.id)) {
        result[row.id] = row.dataUrl;
      }
    }

    res.json({ photos: result });
  } catch (err) {
    logger.error({ err }, "Failed to fetch protocol photos for tenant");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── REST: Fotos hochladen (requires auth; account-scoped) ────────────────────
app.post(
  "/api/photos",
  requireAuth,
  express.json({ limit: "50mb" }),
  async (req: AuthRequest, res) => {
    const photos = (req.body as { photos?: { id: string; dataUrl: string }[] }).photos;
    if (!Array.isArray(photos)) {
      res.status(400).json({ error: "photos array erforderlich" });
      return;
    }

    const accountId = req.user!.accountId;
    let stored = 0;

    for (const p of photos) {
      if (typeof p.id === "string" && typeof p.dataUrl === "string" && p.dataUrl) {
        try {
          await db
            .insert(syncPhotosTable)
            .values({ id: p.id, accountId, dataUrl: p.dataUrl })
            .onConflictDoUpdate({
              target: [syncPhotosTable.accountId, syncPhotosTable.id],
              set: { dataUrl: p.dataUrl, updatedAt: new Date() },
            });
          stored++;
        } catch (err) {
          logger.error({ err, id: p.id }, "Failed to store photo");
        }
      }
    }

    logger.info({ stored, accountId }, "Photos stored");
    res.json({ ok: true, stored });
  }
);

// ── REST: Fotos abrufen (requires auth; returns only account's photos) ────────
app.get("/api/photos", requireAuth, async (req: AuthRequest, res) => {
  const raw = (req.query.ids as string) || "";
  const ids = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (ids.length === 0) {
    res.json({ photos: {} });
    return;
  }

  const accountId = req.user!.accountId;

  try {
    const rows = await db
      .select()
      .from(syncPhotosTable)
      .where(eq(syncPhotosTable.accountId, accountId));

    const result: Record<string, string> = {};
    for (const row of rows) {
      if (ids.includes(row.id)) {
        result[row.id] = row.dataUrl;
      }
    }
    res.json({ photos: result });
  } catch (err) {
    logger.error({ err }, "Failed to fetch photos");
    res.status(500).json({ error: "Internal server error" });
  }
});

server.listen(port, (err?: Error) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
  initSuperAdmin().catch((err) => logger.error({ err }, "initSuperAdmin failed"));
});
