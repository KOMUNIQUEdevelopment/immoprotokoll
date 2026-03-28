import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import express from "express";
import app from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = createServer(app);
const wss = new WebSocketServer({ noServer: true });

const MAX_PAYLOAD = 50 * 1024 * 1024;

const serverProtocols: Record<string, unknown> = {};

// In-memory photo store for cross-device sync (id → dataUrl)
const serverPhotos: Map<string, string> = new Map();

server.on("upgrade", (request, socket, head) => {
  if (request.url === "/api/sync") {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  } else {
    socket.destroy();
  }
});

wss.on("connection", (ws) => {
  logger.info({ clients: wss.clients.size }, "WebSocket client connected");

  try {
    ws.send(JSON.stringify({ type: "init", protocols: serverProtocols }));
  } catch (err) {
    logger.error({ err }, "Failed to send init to new client");
  }

  ws.on("message", (data) => {
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
      serverProtocols[msg.protocol.id] = msg.protocol;
      logger.info({ id: msg.protocol.id, total: Object.keys(serverProtocols).length }, "Protocol updated");
    } else if (msg.type === "delete" && msg.id) {
      delete serverProtocols[msg.id];
      logger.info({ id: msg.id, total: Object.keys(serverProtocols).length }, "Protocol deleted");
    } else {
      return;
    }

    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  });

  ws.on("close", () => {
    logger.info({ clients: wss.clients.size }, "WebSocket client disconnected");
  });

  ws.on("error", (err) => {
    logger.error({ err }, "WebSocket error");
  });
});

// ── REST: Protokoll lesen (für Mieter-Ansicht) ───────────────────────────────
app.get("/api/protocol/:id", (req, res) => {
  const protocol = serverProtocols[req.params.id];
  if (!protocol) {
    res.status(404).json({ error: "Protokoll nicht gefunden" });
    return;
  }
  res.json({ protocol });
});

// ── REST: Unterschrift eintragen & an alle WS-Clients senden ─────────────────
app.post("/api/protocol/:id/sign", (req, res) => {
  const { id } = req.params;
  const { personId, signatureDataUrl } = req.body as {
    personId?: string;
    signatureDataUrl?: string;
  };

  if (!personId || !signatureDataUrl) {
    res.status(400).json({ error: "personId und signatureDataUrl erforderlich" });
    return;
  }

  const protocol = serverProtocols[id] as Record<string, unknown> & {
    personSignatures?: Array<{ personId: string; signatureDataUrl: string | null }>;
  } | undefined;

  if (!protocol) {
    res.status(404).json({ error: "Protokoll nicht gefunden" });
    return;
  }

  const sigs = Array.isArray(protocol.personSignatures) ? [...protocol.personSignatures] : [];
  const idx = sigs.findIndex((s) => s.personId === personId);
  if (idx >= 0) {
    sigs[idx] = { ...sigs[idx], signatureDataUrl };
  } else {
    sigs.push({ personId, signatureDataUrl });
  }
  protocol.personSignatures = sigs;
  serverProtocols[id] = protocol;

  const payload = JSON.stringify({ type: "update", protocol });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });

  logger.info({ id, personId }, "Tenant signature saved and broadcast");
  res.json({ ok: true });
});

// ── REST: Fotos hochladen (cross-device sync) ─────────────────────────────────
// Eigenes JSON-Limit von 50 MB für Foto-Payloads
app.post("/api/photos", express.json({ limit: "50mb" }), (req, res) => {
  const photos = (req.body as { photos?: { id: string; dataUrl: string }[] }).photos;
  if (!Array.isArray(photos)) {
    res.status(400).json({ error: "photos array erforderlich" });
    return;
  }
  let stored = 0;
  for (const p of photos) {
    if (typeof p.id === "string" && typeof p.dataUrl === "string" && p.dataUrl) {
      serverPhotos.set(p.id, p.dataUrl);
      stored++;
    }
  }
  logger.info({ stored, total: serverPhotos.size }, "Photos stored");
  res.json({ ok: true, stored });
});

// ── REST: Fotos abrufen ───────────────────────────────────────────────────────
app.get("/api/photos", (req, res) => {
  const raw = (req.query.ids as string) || "";
  const ids = raw.split(",").map(s => s.trim()).filter(Boolean);
  const result: Record<string, string> = {};
  for (const id of ids) {
    const dataUrl = serverPhotos.get(id);
    if (dataUrl) result[id] = dataUrl;
  }
  res.json({ photos: result });
});

server.listen(port, (err?: Error) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
});
