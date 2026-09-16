# IntelliRide Companion

IntelliRide is a mobile-first rider safety companion for a smart motorcycle helmet, with live telemetry, alerts, emergency contacts, and family tracking.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/intelliride-companion run dev` — run the IntelliRide web app
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/intelliride-companion/src/lib/simulation.ts` — local telemetry simulator, persistence, Firebase Realtime Database adapter seam, alerts, contacts, and family state
- `artifacts/intelliride-companion/src/pages/` — the five rider-facing screens
- `artifacts/intelliride-companion/src/components/map-panel.tsx` — React-Leaflet/OpenStreetMap map surface
- `artifacts/intelliride-companion/src/index.css` — IntelliRide visual language and responsive shell styles
- `artifacts/intelliride-companion/public/manifest.json` — phone home-screen manifest

## Architecture decisions

- The demo stays usable without Firebase values by using localStorage-backed simulation, then activates Firebase Realtime Database listeners and writes when `VITE_FIREBASE_*` values are present.
- Telemetry data keeps the requested Realtime Database paths and fixed demo rider/family IDs so the simulator can be replaced by ESP32 data without changing page components.
- Maps use React-Leaflet with OpenStreetMap tiles; no billing account or paid map key is required.
- The web app is intentionally mobile-first with a bottom tab bar and a wider desktop rail rather than an admin-dashboard layout.

## Product

- Track live or last-known rider position, speed, heading, GPS freshness, battery, BLE, and cellular signal.
- Simulate ride telemetry, GPS loss, crash countdowns, SOS, overspeed thresholds, and device alerts.
- Review alert history, manage emergency contacts, and monitor simulated family riders.

## User preferences

- Use only free, no-signup services for the demo; do not add Google Maps or a paid map provider.
- Keep the telemetry simulation isolated so it can be replaced by real hardware later.

## Gotchas

- Local development builds need the workflow-provided `PORT` and `BASE_PATH` values; use the managed web workflow for preview.
- Firebase is intentionally optional in the first demo; provide the `VITE_FIREBASE_*` values before expecting Realtime Database reads/writes.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
