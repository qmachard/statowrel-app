# StatOwrel — Architecture

Status: **initial scaffold**. This document describes the monorepo as bootstrapped — tooling, structure, and conventions — not a finished product. No domain models, no screens, no admin collections exist yet; they are added incrementally on top of this foundation.

## Stack

| Layer | Choice | Notes |
|---|---|---|
| Monorepo | Turborepo + npm workspaces | npm only — never yarn/pnpm/bun |
| Language | TypeScript 5.4+ | Strict mode everywhere |
| Mobile app | React Native + Expo (managed workflow) + EAS | iOS + Android from one codebase |
| Mobile styling | Nativewind (Tailwind CSS for RN) | Design tokens (neobrutalism) added later, separately |
| Mobile routing | Expo Router | File-based, `apps/app/app/` |
| Backoffice | React 18 + Vite (SPA) + FireCMS v2 + MUI | Firebase-Hosting-deployed admin UI |
| Backend | Firebase Cloud Functions v2 (gen2) + Express 5 | Domain-driven structure, HTTP + Firestore triggers |
| Database | Firebase Firestore | NoSQL, event-sourcing-friendly, `v1_` collection prefix |
| Auth | Firebase Auth | Client SDK on mobile (`firebase`, not `@react-native-firebase`), Admin SDK in functions |
| Storage | Firebase Storage | Rules in `packages/firestore-config/storage.rules` |

## Why the Firebase client SDK on mobile (not `@react-native-firebase`)

`@statowrel/models`'s Firestore converters are written against the `firebase/firestore` (client) and `firebase-admin/firestore` (admin) type surfaces — see `UniversalTimestamp`/`UniversalGeoPoint`/`UniversalSnapshot` in `packages/models/src/commons.ts`. Using the JS `firebase` SDK in `apps/app` means the exact same converter file works unchanged on mobile, in `apps/firecms`, and (via the admin variant) in `apps/functions` — one model, one converter, three consumers. It also means the app works in Expo Go during development (no native module linking required for Firestore/Auth), only needing a custom dev client once a native-only module is introduced.

The tradeoff: no `@react-native-firebase`-specific features (e.g. some background/offline behaviors are weaker on the JS SDK). Revisit this decision if a specific feature requires it — it would mean introducing prebuild/dev-client requirements earlier.

## Monorepo layout

```
statowrel-app/
├── apps/
│   ├── app/          # React Native + Expo + EAS + Nativewind — the mobile app
│   ├── firecms/       # React + Vite + FireCMS v2 — backoffice
│   └── functions/     # Firebase Cloud Functions v2 + Express 5 — backend
├── packages/
│   ├── models/                # @statowrel/models — TS models + Firestore converters
│   └── firestore-config/      # @statowrel/firestore-config — rules + indexes
├── docs/
│   └── architecture.md        # this file
├── firebase.json              # functions + firestore + storage + hosting (firecms) config
├── .firebaserc                # `default` / `production` Firebase project aliases
├── turbo.json
└── package.json
```

### Dependency graph

```
apps/app ──┐
apps/firecms ─┼──► @statowrel/models ──► firebase / firebase-admin (types only, per SDK)
apps/functions ┘
```

`@statowrel/firestore-config` has no code dependents — it's deployed standalone via the Firebase CLI (`firebase deploy --only firestore:rules,firestore:indexes,storage`).

## `@statowrel/models`

Single source of truth for Firestore data shapes, shared by all three apps. `src/commons.ts` provides the SDK-agnostic infrastructure:

- `UniversalTimestamp` / `UniversalGeoPoint` / `UniversalSnapshot<T>` — union types spanning the client and admin SDKs, so one converter file works everywhere.
- `FirestoreConverter<TData, TFirestoreData>` — the factory signature every model's converter follows, parameterized by the SDK's `Timestamp`/`GeoPoint` classes.
- `ModelData<T>` — recursively maps a "wire" type (with `UniversalTimestamp`/`UniversalGeoPoint` fields) to its app-facing type (`string` timestamps, `{ latitude, longitude }` points).
- `parseTimestamp` — tolerant timestamp parsing for `fromFirestore` (handles both `Timestamp` and legacy ISO-string values written via raw `.update()` calls).

As domain models are designed, add one file per Firestore collection (`v1_<name>.ts`) following this shape (adapted from planexplora-hub's `customerConverter` pattern):

```ts
export type XFirebaseData = { /* raw Firestore shape, UniversalTimestamp fields */ };
export type XData = ModelData<XFirebaseData>;
export const X_COLLECTION = 'v1_x';
export const xConverter: FirestoreConverter<XData, XFirebaseData> = (TimestampClass) => ({
  toFirestore: (data) => removeMissingFields({ /* ... */ }),
  fromFirestore: (snap) => { const data = snap.data(); return { /* parseTimestamp, ?? null, etc. */ }; },
});
```

Re-export every new model from `src/index.ts`.

## `apps/functions` — domain structure

Each domain under `src/domains/` is self-contained:

```
domains/{domain-name}/
├── api/{handlers,middlewares,index.ts}   # HTTP routes — Express app + onRequest export
├── triggers/{steps,onXxxCreated.ts}       # Firestore triggers → step handlers
├── helpers/                                # business logic
├── tasks/                                  # Cloud Tasks handlers
├── schedules/                               # Cloud Scheduler handlers
└── index.ts                                 # re-exports Cloud Function registrations only
```

`src/index.ts` re-exports each domain as a namespace (`export * as health from './domains/health'`), so Firebase names functions `<domain>-<exportName>` (e.g. `health-healthApi`). `src/domains/health` is a minimal working example (`GET /ping`) proving the wiring end-to-end; it's a template to copy, not a real feature.

`src/libs/firebase-admin.ts` centralizes all Firestore/Storage access (`getDocumentRef`, `getSubCollectionRef`, `createWriteBatch`, `getAdminStorageSignedUrl`, …) — every ref is created with a `@statowrel/models` converter, never read untyped.

## `apps/firecms` — backoffice

FireCMS v2 SPA. `src/collections/index.ts` is the list of `EntityCollection` definitions (currently empty). Each collection is added as its own file once the corresponding model exists in `@statowrel/models`, using that model's converter and `*_COLLECTION` constant, then registered in the index. `src/authenticator/admin.ts` is the sign-in gate (currently: any authenticated user — tighten to an email allow-list, or a custom `admin` auth claim checked server-side, before shipping).

## `apps/app` — mobile

Expo managed workflow, Expo Router for navigation, Nativewind for styling. `app.config.ts` is a dynamic config keyed off `APP_VARIANT` (`development` | `preview` | `production`) so the three EAS build profiles produce distinct app names / bundle identifiers / package names — dev, preview, and production builds can be installed side-by-side on the same device.

### EAS build/submit pipeline

Three build profiles in `eas.json`, mapped to root-level npm scripts:

| Profile | Distribution | Script |
|---|---|---|
| `development` | internal, dev client | `build:dev:ios`, `build:dev:android` |
| `preview` | internal | `build:preview:ios`, `build:preview:android` |
| `production` | store submission | `build:prod:ios`, `build:prod:android` |

`submit:prod` runs `eas submit --profile production` for both platforms. Store credentials (Apple/Google) are configured once via `eas credentials` and stored by EAS, not in this repo.

### Design system

Not installed yet. The intended direction is a **neobrutalism** visual style (reference: [neoflux](https://neobrutalism.com/preview/templates/neoflux)) — flat saturated colors, thick black borders, hard offset shadows, no gradients or blur. This is deliberately deferred to a dedicated step: choosing the palette/tokens, installing any font/icon dependencies, and building the shared component primitives (buttons, cards, inputs) before any real screen is built on top of them. `apps/app/tailwind.config.js` currently has no custom theme — just the Nativewind preset.

## Firestore rules & indexes

`packages/firestore-config/firestore.rules` establishes the pattern: a wildcard `isAdmin()` bypass at the top (for the FireCMS backoffice, via a custom `admin` auth claim) followed by explicit per-collection rules for the mobile app's own access — collections are never left world-readable/writable by omission. `firestore.indexes.json` is empty; add composite indexes as Firestore's emulator/console error messages require them (copy the definition from the error, don't hand-write it).

## Environments

Two Firebase projects, aliased in `.firebaserc`:

- `default` → `statowrel-dev`
- `production` → `statowrel-prod`

`npm run deploy:*` scripts switch project via `firebase use` before deploying and switch back to `default` afterward for the `:production` variants, mirroring planexplora-hub's convention.

## What's deliberately not here yet

- No Firestore data models (`packages/models` only has `commons.ts`).
- No FireCMS collections, no app screens beyond the placeholder route.
- No design system / theme tokens for Nativewind.
- No shared React-hooks package (a `@repo/firebase-react` equivalent) — introduce one only once real duplication appears between `apps/app` and `apps/firecms`.
- No tests — matches the rest of the org's convention; do not add test infrastructure without explicit discussion.
