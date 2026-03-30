# ImmoProtokoll

## Project Goal

Full SaaS version of the Übergabeprotokoll app. Multi-tenant, with Stripe billing, multilingual support (DE-CH, DE-DE, EN), and a superadmin dashboard. Strictly black-and-white design.

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + Tailwind CSS

## Design System

- **Colors**: Strictly black (#000) and white (#fff), no color accents
- **Brand**: ImmoProtokoll, house-icon logo (black square, white house)
- **Font**: System font stack

## Auth

- HTTP-only cookie (`immo_session`), 30-day sessions stored in PostgreSQL
- bcryptjs password hashing
- Roles: `owner`, `administrator`, `property_manager`
- Plans: `free`, `privat`, `agentur`, `custom`
- Superadmin: `support@immoprotokoll.com` (init on server start via `SUPERADMIN_PASSWORD` env var)
- Middleware: `requireAuth`, `requireRole`, `requireSuperAdmin` in `artifacts/api-server/src/middleware/auth.ts`

## Navigation Flow

1. Login → **PropertyListPage** (list of properties for the account)
2. Click Property → **PropertyProtocolsPage** (protocols filtered by `propertyId`)
3. Click Protocol → **ProtocolEditor** (existing editor with FloorEditor)
4. Back from editor → returns to PropertyProtocolsPage

## Protocols & Floors

- `ProtocolData.propertyId: string | null` — links a protocol to a property (null for legacy)
- `ProtocolData.floors: FloorDef[]` — user-defined ordered floors, each `{ id: string; name: string }`
- `RoomData.floor` stores the floor ID (UUID for new protocols, floor name string for legacy)
- Legacy protocols: `migrateProtocol()` derives `floors[]` from existing `room.floor` strings
- New protocols: start with empty `floors[]` and `rooms[]`; users build structure via `FloorEditor`
- `FloorEditor` component (`artifacts/uebergabeprotokoll/src/components/FloorEditor.tsx`) uses `@dnd-kit` for drag-to-reorder floors and rooms

## Properties API

- `GET /api/properties` → returns array of properties (flat, no wrapper object)
- `POST /api/properties` → creates property, returns flat property object
- `PATCH /api/properties/:id` → updates property, returns flat property object
- `DELETE /api/properties/:id` → deletes property (not allowed for property_manager role)
- `GET /api/properties/:id/protocols` → returns `{ protocols }` for a property

## Plan Limits

Defined in `artifacts/api-server/src/routes/properties.ts`:
- `free`:    1 property, 1 protocol/property
- `privat`:  1 property, 30 protocols/property
- `agentur`: 50 properties, 30 protocols/property
- `custom`:  unlimited

## DB Package Build

After changing `lib/db/src/schema/`, run `cd lib/db && pnpm exec tsc --build --force` to regenerate `.d.ts` declarations before TypeScript can pick up the new exports.

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/              # Express API server (port via $PORT)
│   └── uebergabeprotokoll/      # React frontend (ImmoProtokoll)
├── lib/
│   ├── db/                      # Drizzle ORM schema + DB connection
│   │   └── src/schema/          # accounts, users, sessions tables
│   ├── api-spec/                # OpenAPI spec + Orval codegen config
│   ├── api-client-react/        # Generated React Query hooks
│   └── api-zod/                 # Generated Zod schemas from OpenAPI
├── scripts/                     # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── tsconfig.json
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers; `src/routes/health.ts` exposes `GET /health` (full path: `/api/health`)
- Depends on: `@workspace/db`, `@workspace/api-zod`
- `pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle (`dist/index.cjs`)
- Build bundles an allowlist of deps (express, cors, pg, drizzle-orm, zod, etc.) and externalizes the rest

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models
- `src/schema/<modelname>.ts` — table definitions with `drizzle-zod` insert schemas (no models definitions exist right now)
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`, automatically provided by Replit)
- Exports: `.` (pool, db, schema), `./schema` (schema only)

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`, and we fallback to `pnpm --filter @workspace/db run push-force`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec (e.g. `HealthCheckResponse`). Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec (e.g. `useHealthCheck`, `healthCheck`).

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.
