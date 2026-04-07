import path from "node:path";
import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// ── www → apex 301 redirect ───────────────────────────────────────────────────
// Must run before every other middleware so the redirect is served immediately.
// req.url preserves the full path + query string, e.g. /en?utm_source=x
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.hostname === "www.immoprotokoll.com") {
    return res.redirect(301, `https://immoprotokoll.com${req.url}`);
  }
  next();
});

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : undefined;

const isProduction = process.env.NODE_ENV === "production";

if (!allowedOrigins && isProduction) {
  logger.warn(
    "ALLOWED_ORIGINS is not set in production. Cross-origin requests will be denied. " +
      "Set ALLOWED_ORIGINS=https://your-domain.com to enable cross-origin access."
  );
}

app.use(
  cors({
    origin: allowedOrigins ?? (isProduction ? false : true),
    credentials: true,
  }),
);

app.use(cookieParser());

// Raw body required for Stripe webhook signature verification — must come before express.json
app.use(
  "/api/billing/webhook",
  express.raw({ type: "application/json" }),
  (_req: Request, _res: Response, next: NextFunction) => next()
);

// Protocols now include photo dataUrls directly in the JSON payload (up to ~50MB
// for many high-res photos). The photo upload endpoint also uses 50MB. Keep both
// limits in sync.
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.use("/api", router);

// ── Production: serve built frontend static files ────────────────────────────
// In development (Replit), Vite dev servers run separately.
// In production (Cloud Run), Express serves all static assets directly.
if (isProduction) {
  const cwd = process.cwd();
  const appDir = path.join(cwd, "artifacts/uebergabeprotokoll/dist/public");
  const landingDir = path.join(cwd, "artifacts/landing/dist/public");

  // Route by hostname:
  //   app.immoprotokoll.com  → Übergabeprotokoll PWA (built with BASE_PATH=/)
  //   everything else        → Marketing Landing Page
  const serveApp = express.static(appDir);
  const serveLanding = express.static(landingDir);

  // Redirect legacy /app/* paths to app subdomain
  app.use("/app", (req: Request, res: Response) => {
    const rest = req.path === "/" ? "" : req.path;
    return res.redirect(301, `https://app.immoprotokoll.com${rest}`);
  });

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.hostname.startsWith("app.")) {
      return serveApp(req, res, () => {
        res.sendFile(path.join(appDir, "index.html"));
      });
    }
    next();
  });

  app.use(serveLanding);
  app.use((_req: Request, res: Response) => {
    res.sendFile(path.join(landingDir, "index.html"));
  });

  logger.info("Production mode: serving static files from dist/public directories");
}

// ── Global JSON error handler ─────────────────────────────────────────────────
// Must be registered AFTER all routes. Catches any error passed via next(err)
// (e.g. unhandled throws in async middleware) and returns JSON instead of
// Express's default HTML error page.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, "Unhandled Express error");
  const msg = err?.message || "Internal Server Error";
  if (!res.headersSent) {
    res.status(500).json({ error: msg });
  }
});

export default app;
