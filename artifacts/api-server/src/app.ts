import express, { type Express, type Request, type Response, type NextFunction } from "express";
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

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

app.use("/api", router);

export default app;
