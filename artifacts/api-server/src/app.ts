import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

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

if (!allowedOrigins && process.env.NODE_ENV === "production") {
  logger.warn(
    "ALLOWED_ORIGINS is not set — CORS will reflect all origins with credentials. " +
      "Set ALLOWED_ORIGINS=https://your-domain.com in production."
  );
}

app.use(
  cors({
    // In production with no ALLOWED_ORIGINS configured, reflect origin (dev-only fallback).
    // Set ALLOWED_ORIGINS env var to a comma-separated list for production deployments.
    origin: allowedOrigins ?? true,
    credentials: true,
  }),
);

app.use(cookieParser());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

app.use("/api", router);

export default app;
