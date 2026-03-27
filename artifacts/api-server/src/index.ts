import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
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

server.listen(port, (err?: Error) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
});
