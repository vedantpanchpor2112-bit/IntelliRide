# IntelliRide Companion App — Project Summary

*Re-upload this file to Claude to resume exactly where this left off.*

## Project context

- **Hardware project**: SIH Hackathon 2026, Problem Statement ID 26220, team
  "Smart Skulls." Smart motorcycle helmet with wireless BLE turn indicators,
  IMU-based crash detection, GPS tracking, 4G emergency alerts, manual SOS
  button. Full technical details in the original `IntelliHelmet.pdf` slide deck.
- **This app** is the companion/software half of that project — a real-time
  tracking + emergency-response app that pairs with the helmet.
- Builder: Rajiv, 2nd-year B.Tech Mechanical Engineering (EV minor), MMCOE Pune.
  Teammates on related work: Anoop Pawar, Soham Anasane.

## Tech stack decisions (and why)

- **React web app** (Vite + TypeScript + Tailwind + shadcn/ui) — NOT React
  Native/Expo. Chosen because it's being built in Replit, which is optimized
  for instant browser preview/hosting; a web app plays to that strength.
  Works fine on phones via browser, installable to home screen as a PWA.
- **Firebase Realtime Database** — free Spark plan, no billing account
  needed. Used for all live data (location, status, alerts, contacts).
- **Maps: React-Leaflet + OpenStreetMap/CartoDB tiles** — NOT Google Maps.
  Google Maps requires a linked credit card even for free-tier usage;
  Leaflet + OSM needs no API key, no billing, no sign-up at all.
- **Build tool**: Replit's Agent (both the coding Agent and a separate
  "Design" tool were used — these draw from two SEPARATE free credit pools).

## Data model (Firebase Realtime Database)

```
/riders/{riderId}/location            { lat, lng, speed, heading, timestamp }
/riders/{riderId}/lastKnownLocation   { lat, lng, timestamp }
  — written only on a valid GPS fix; UI falls back to this when
    /location.timestamp is >15s stale (signal lost)
/riders/{riderId}/status              { battery, bleConnected, signalStrength,
                                         ridingState: "riding"|"parked"|"crash" }
/riders/{riderId}/alerts/{id}         { type, title, timestamp,
                                         sentTo: [contactId,...] | null,
                                         status: "sent"|"cancelled" }
/riders/{riderId}/emergencyContacts/{id} { name, phone, relation, isPrimary }
/riders/{riderId}/medicalProfile      { bloodGroup, allergies, conditions,
                                         medications, organDonor, notes }
  — NEW, in progress (see "In-progress feature" below)
/families/{familyId}/members          [riderId, riderId, ...]
```

Fixed demo IDs in use: `riderId = "demo-rider-1"`, `familyId = "demo-family-1"`
(no login flow yet — single-user demo).

## App structure (5 screens, bottom tab bar)

1. **Track** — live map, speed, GPS coords, battery/BLE/4G stat cards,
   crash banner (10s cancel countdown → auto-SOS), manual SOS button,
   demo controls panel (simulate ride/crash/signal-loss)
2. **Speed & Alerts** — live gauge, adjustable overspeed threshold, alert log
3. **Alerts** — full alert history; contact-facing alerts show "Sent to:
   [names]," others show "Logged only"
4. **Contacts** — CRUD emergency contacts, one marked primary
5. **Family** — Find My–style list of family members, live/idle status,
   speed, location with same staleness fallback logic as Track

## Design decisions

- **Originally dark theme**, later **switched to light theme** for a more
  "professional" look. Two rounds of polish guidance given: dark-theme
  version (amber #FF8A3D / cyan #4FC3F7 / red #FF4757 / green #34D399 on
  near-black), then light-theme version (same accents, but hairline borders
  instead of drop-shadows, hierarchy via weight not just color, restraint
  on where accent colors appear).
- Typography: Space Grotesk for headers/speed readout (tabular numerals),
  Inter for body text.
- **Important discovery**: the app is built with **shadcn/ui + Tailwind**,
  so actual color variables live in `src/index.css` (shadcn convention:
  `--background`, `--card`, `--border`, `--muted-foreground`, etc.) — NOT
  a custom `var(--surface)` theme file as originally assumed. Any pasted
  code needs to match shadcn's actual variable names, not guessed ones.

## Firebase project (already created)

- Firebase project name: `intelliride`
- Realtime Database created, region ~`asia-southeast1`
- Web app registered, config values retrieved (App ID:
  `1:906274017910:web:ed887b55a15b00d4e44557`)
- All 7 config values added as **Replit Secrets** — note: Replit has TWO
  separate secrets panels, "workspace secrets" (for Run/testing) and
  "deployment secrets" (for the published live URL) — BOTH need the same
  7 values entered separately:
  `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`,
  `VITE_FIREBASE_DATABASE_URL`, `VITE_FIREBASE_PROJECT_ID`,
  `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`,
  `VITE_FIREBASE_APP_ID`
- Firebase Rules still in open/test mode — needs locking down (see
  "Pending" below) before sharing any live link publicly.
- **Discovered adapter pattern**: a note at `.agents/memory/intelliride-firebase.md`
  (left by Replit's own Agent) says: *"The demo runs offline-first and only
  enables Realtime Database when the complete VITE_FIREBASE configuration
  is available. The simulator is the default source of truth for the first
  demo, while the Firebase adapter uses the helmet data model and fixed
  demo rider/family paths when configured."* This means the app has a
  designed seam between fake/simulated data and real Firebase data — any
  new feature should follow this same adapter pattern rather than adding
  direct Firebase calls into individual screen components.

## Actual file structure in Replit (confirmed by screenshot)

```
artifacts/
  api-server/
  intelliride-companion/        ← THIS IS THE REAL APP (work here only)
    dist/
    public/
    src/
      components/
      hooks/
      lib/                      ← likely holds the Firebase adapter + simulator
      pages/
        contacts.tsx            ← Contacts screen
        track.tsx               ← Track screen
        (speed/alerts/family pages presumably alongside these)
      App.tsx
      index.css                 ← shadcn/ui color variables live here
      main.tsx
  intelliride-design-system/    ← IGNORE — leftover from the separate
  mockup-sandbox/               ← IGNORE — Design tool's own sandbox projects
```

**Important**: file search in Replit surfaces matches from ALL THREE
`artifacts/` subfolders, including the two to ignore. Always confirm a
result's path starts with `artifacts/intelliride-companion/` before using it.

## Credits/access status (as of last check)

- Replit **coding Agent**: 100% of free allowance used
- Replit **Design tool**: 100% used, resets Oct 13, 2026 (too late for
  hackathon timeline — don't wait on it)
- **Workaround in use**: manual code editing (Claude writes code, paste
  directly into Replit's file editor — costs zero Agent credits) for
  anything that doesn't need AI-driven file discovery
- Other options discussed but not yet acted on: teammate forks the Repl
  for a fresh quota; GitHub Student Developer Pack; Cursor's student
  discount is CLOSED to new signups as of June 25, 2026 (fraud abuse) —
  don't pursue that path

## In-progress feature: Rider Medical ID

Adding a collapsible "Rider Medical ID" card (blood group, allergies,
existing conditions, medications, organ donor status, notes for responders)
to the Contacts screen, backed by `/riders/{riderId}/medicalProfile`.

**Status**: a first draft of this component was written using generic
`var(--surface)`-style CSS variables — this needs to be REDONE once we
confirm the actual shadcn/ui variable names from `src/index.css`, and
ideally restructured to go through the app's existing simulator/Firebase
adapter pattern (found in `src/lib/`) rather than calling Firebase directly
from the component.

**Not yet decided**: whether medical info should also surface automatically
on the crash/SOS banner in the Track screen (front-and-center the moment an
alert fires), or stay only in the Contacts screen.

## Immediate next steps (pending when this was saved)

1. Open `src/lib/` folder contents in Replit, screenshot/list what's there
   — looking for the Firebase adapter and simulator files
2. Open `src/index.css` contents — need the actual shadcn color variable
   names to write correctly-styled code
3. Once both are known: rewrite the medical profile component to (a) use
   correct CSS variable names, (b) follow the existing adapter pattern,
   (c) confirm exact file path for the Firebase/adapter import
4. Lock down Firebase Rules before any public demo link is shared
5. Decide on medical-info-on-crash-banner question above
