import { createServer, type IncomingMessage } from "http";
import { WebSocketServer, WebSocket } from "ws";
import express from "express";
import { eq, and } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  sessionsTable,
  usersTable,
  syncProtocolsTable,
  syncPhotosTable,
} from "@workspace/db";
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

async function resolveAccountFromRequest(
  request: IncomingMessage
): Promise<string | null> {
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
    .select({ accountId: usersTable.accountId })
    .from(usersTable)
    .where(eq(usersTable.id, session.userId))
    .limit(1);

  return users[0]?.accountId ?? null;
}

const server = createServer(app);
const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", async (request, socket, head) => {
  if (request.url !== "/api/sync") {
    socket.destroy();
    return;
  }

  const accountId = await resolveAccountFromRequest(request);
  if (!accountId) {
    socket.write("HTTP/1.1 401 Unauthorized\r\nContent-Length: 0\r\n\r\n");
    socket.destroy();
    return;
  }

  (request as IncomingMessage & { accountId: string }).accountId = accountId;

  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request);
  });
});

wss.on("connection", async (ws, request) => {
  const accountId = (request as IncomingMessage & { accountId: string }).accountId;
  logger.info({ clients: wss.clients.size, accountId }, "WebSocket client connected");

  // Load all protocols for this account from the DB and send to client
  try {
    const rows = await db
      .select()
      .from(syncProtocolsTable)
      .where(eq(syncProtocolsTable.accountId, accountId));

    const protocols: Record<string, unknown> = {};
    for (const row of rows) {
      protocols[row.id] = row.data;
    }
    ws.send(JSON.stringify({ type: "init", protocols }));
  } catch (err) {
    logger.error({ err }, "Failed to load protocols for WS init");
  }

  ws.on("message", async (data) => {
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
        personSignatures?: Array<{ personId: string; signatureDataUrl: string | null }>;
      };

      try {
        const existingRows = await db
          .select()
          .from(syncProtocolsTable)
          .where(
            and(
              eq(syncProtocolsTable.id, incoming.id),
              eq(syncProtocolsTable.accountId, accountId)
            )
          )
          .limit(1);

        const existing = existingRows[0]?.data as typeof incoming | undefined;

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
        await db
          .insert(syncProtocolsTable)
          .values({
            id: incoming.id,
            accountId,
            data: incoming as unknown as Record<string, unknown>,
          })
          .onConflictDoUpdate({
            target: [syncProtocolsTable.accountId, syncProtocolsTable.id],
            set: {
              data: incoming as unknown as Record<string, unknown>,
              updatedAt: new Date(),
            },
          });

        logger.info({ id: incoming.id, accountId }, "Protocol updated");

        const broadcastPayload = JSON.stringify({ type: "update", protocol: incoming });
        wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            const clientAccountId = (client as WebSocket & { accountId?: string }).accountId;
            if (clientAccountId === accountId) {
              client.send(broadcastPayload);
            }
          }
        });
        (ws as WebSocket & { accountId?: string }).accountId = accountId;
      } catch (err) {
        logger.error({ err }, "Failed to update protocol");
      }
    } else if (msg.type === "delete" && msg.id) {
      try {
        await db
          .delete(syncProtocolsTable)
          .where(
            and(
              eq(syncProtocolsTable.id, msg.id),
              eq(syncProtocolsTable.accountId, accountId)
            )
          );

        logger.info({ id: msg.id, accountId }, "Protocol deleted");

        const deleteBroadcast = JSON.stringify({ type: "delete", id: msg.id });
        wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            const clientAccountId = (client as WebSocket & { accountId?: string }).accountId;
            if (clientAccountId === accountId) {
              client.send(deleteBroadcast);
            }
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
        const clientAccountId = (client as WebSocket & { accountId?: string }).accountId;
        if (clientAccountId === rows[0].accountId) {
          client.send(broadcastPayload);
        }
      }
    });

    logger.info({ id, personId }, "Tenant signature saved and broadcast");
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "Failed to save signature");
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
