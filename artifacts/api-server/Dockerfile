# ============================================================
# ImmoProtokoll – Multi-stage Docker build
# Builds: API server + Landing Page + Übergabeprotokoll PWA
# Runtime: single Cloud Run container (Express serves static)
# Region target: europe-west6 (Zürich)
# ============================================================

FROM node:24-slim AS builder
WORKDIR /app

RUN npm install -g pnpm@10

# ── Dependency layer (cache-friendly: copy manifests first) ──────────────────
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY lib/db/package.json                          ./lib/db/
COPY lib/api-spec/package.json                    ./lib/api-spec/
COPY lib/api-client-react/package.json            ./lib/api-client-react/
COPY lib/api-zod/package.json                     ./lib/api-zod/
COPY artifacts/api-server/package.json            ./artifacts/api-server/
COPY artifacts/landing/package.json               ./artifacts/landing/
COPY artifacts/uebergabeprotokoll/package.json    ./artifacts/uebergabeprotokoll/
COPY artifacts/mockup-sandbox/package.json        ./artifacts/mockup-sandbox/
COPY scripts/package.json                         ./scripts/

RUN pnpm install --frozen-lockfile

# ── Source files ─────────────────────────────────────────────────────────────
COPY tsconfig.json tsconfig.base.json ./
COPY lib/                             ./lib/
COPY artifacts/api-server/            ./artifacts/api-server/
COPY artifacts/landing/               ./artifacts/landing/
COPY artifacts/uebergabeprotokoll/    ./artifacts/uebergabeprotokoll/

# ── Build: API server (esbuild → artifacts/api-server/dist/index.mjs) ────────
RUN pnpm --filter @workspace/api-server run build

# ── Build: Landing Page (Vite → artifacts/landing/dist/public/) ──────────────
# PORT is required by vite.config.ts but only used for dev server, not build output.
RUN PORT=3000 BASE_PATH=/ NODE_ENV=production \
    pnpm --filter @workspace/landing run build

# ── Build: Übergabeprotokoll PWA (Vite → artifacts/uebergabeprotokoll/dist/public/) ──
# BASE_PATH=/ because the app is served at the root of app.immoprotokoll.com
RUN PORT=3001 BASE_PATH=/ NODE_ENV=production \
    pnpm --filter @workspace/uebergabeprotokoll run build

# ============================================================
# Production runtime – minimal image, only compiled output
# ============================================================
FROM node:24-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

# API server bundle (esbuild – nearly self-contained ESM + pino workers)
COPY --from=builder /app/artifacts/api-server/dist/ ./artifacts/api-server/dist/

# Frontend static files served by Express at runtime
COPY --from=builder /app/artifacts/landing/dist/public/              ./artifacts/landing/dist/public/
COPY --from=builder /app/artifacts/uebergabeprotokoll/dist/public/   ./artifacts/uebergabeprotokoll/dist/public/

CMD ["node", "--enable-source-maps", "artifacts/api-server/dist/index.mjs"]
