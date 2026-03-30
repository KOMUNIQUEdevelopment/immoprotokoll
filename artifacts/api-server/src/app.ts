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

const isProduction = process.env.NODE_ENV === "production";

if (!allowedOrigins && isProduction) {
  logger.warn(
    "ALLOWED_ORIGINS is not set in production. Cross-origin requests will be denied. " +
      "Set ALLOWED_ORIGINS=https://your-domain.com to enable cross-origin access."
  );
}

app.use(
  cors({
    // Development: reflect all origins (permissive for local dev/Replit preview).
    // Production with ALLOWED_ORIGINS: use the explicit allowlist.
    // Production without ALLOWED_ORIGINS: deny all cross-origin requests (fail-closed).
    origin: allowedOrigins ?? (isProduction ? false : true),
    credentials: true,
  }),
);

app.use(cookieParser());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

app.use("/api", router);

export default app;
