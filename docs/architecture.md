# StatOwrel — Architecture

Status: **early**. This document describes the monorepo's tooling, structure, and conventions — not a finished product. The first domain model (`v1_questions`) and its FireCMS collection exist; there are still no app screens. The rest is added incrementally on top of this foundation.

## Stack

| Layer | Choice | Notes |
|---|---|---|
| Monorepo | Turborepo + npm workspaces | npm only — never yarn/pnpm/bun |
| Language | TypeScript 5.4+ | Strict mode everywhere |
| Mobile app | React Native + Expo (managed workflow) + EAS | iOS + Android from one codebase |
| Mobile styling | Nativewind (Tailwind CSS for RN) | Neobrutalism design tokens in `tailwind.config.js`; component primitives added later |
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

### `v1_questions` — first model

`packages/models/src/v1_questions.ts`. The pot of questions users propose and moderators approve — see `docs/prd.md` §4.7 and §5.

| Field | Type | Notes |
|---|---|---|
| `label` | `string` | e.g. "Ton dentifrice, tu le presses…" |
| `options` | `Record<ULID, { label, stat_label, position }>` | 2 to 6 entries — `label` is shown ("Par le bout"), `stat_label` is the StatOwrel earned ("méthodique") |
| `status` | `'pending' \| 'approved' \| 'rejected' \| 'used'` | moderation lifecycle; `used` questions are never redrawn |
| `author_id` | `string` | credited on the question screen once drawn |
| `rejection_reason` | `string \| null` | sent back to the author; set only when `rejected` |
| `created_at` | `UniversalTimestamp` | |

Three decisions the PRD makes and the model enforces:

- **`options` is a map keyed by ULID, not an array.** An answer stores an `option_id`, and `v1_daily_questions.answer_counts` increments `answer_counts.{option_id}` via `FieldValue.increment()` on a fixed path. With an array, a moderator reordering options would repoint recorded answers, and two concurrent answers incrementing `answer_counts[2]` would overwrite each other.
- **Display order comes from `position`, never from key order**, which Firestore does not guarantee. `sortQuestionOptions()` is the only supported way to read the options in order — use it rather than iterating the map.
- **ULIDs are minted client-side**, in the app or the backoffice, at the moment the option is typed in. No server round-trip for an id, and the ids sort by creation date.

There is no `is_multiple` flag: v1 is single-choice only, and multiple-answer questions are explicitly out of scope (`docs/prd.md` §6).

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

FireCMS v2 SPA. `src/collections/index.ts` is the list of `EntityCollection` definitions. Each collection is added as its own file once the corresponding model exists in `@statowrel/models`, using that model's `*_COLLECTION` constant, then registered in the index. `src/collections/questions.ts` is the first one.

Two things to know when writing a collection:

- **FireCMS does not use our converters.** It reads Firestore through its own data source, which maps `Timestamp` → `Date`. So a collection is typed against a local variant of the model's `*Data` type with `Date` timestamps, not against `*Data` itself.
- **Maps with dynamic keys need a custom field.** FireCMS v2 can only type a map's sub-properties when the keys are known up front, and `v1_questions.options` is keyed by ULID. `src/collections/fields/QuestionOptionsField.tsx` renders the options as a reorderable list, mints a ULID on "add", and renumbers `position` densely on every change. The built-in key/value editor would have moderators typing ULIDs by hand.
- **Collection-level invariants live in `callbacks.onPreSave`.** The backoffice writes as an admin, and the wildcard `isAdmin()` rule lets those writes through unchecked — so the 2–6 options rule and "a rejected question needs a reason" are enforced there as well as in `firestore.rules`.

`src/authenticator/admin.ts` is the sign-in gate (currently: any authenticated user — tighten to an email allow-list, or a custom `admin` auth claim checked server-side, before shipping).

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

**Neobrutalism** visual style (reference: [neoflux](https://neobrutalism.com/preview/templates/neoflux)) — flat saturated colors, thick black borders, hard offset shadows, no gradients or blur. Tokens live in `apps/app/tailwind.config.js`: color palette (`background`/`foreground`/`card`/`primary`/`primary-hover`/`secondary`/`muted`/`accent`/`destructive`/`border`/`input`/`ring`), `fontFamily` (`font-head` = Archivo Black, `font-sans` = Space Grotesk), `borderRadius` collapsed to `0` (except `full`), a thicker default `borderWidth` (2px), and a hard-offset, no-blur `boxShadow` scale (`xs`/`sm`/`DEFAULT`/`md`/`lg`/`xl`/`2xl`). Fonts load via `expo-font` + `@expo-google-fonts/archivo-black` + `@expo-google-fonts/space-grotesk` in `apps/app/app/_layout.tsx`, with the splash screen held until `useFonts` resolves.

neobrutalism.com's own registry ships components through the `shadcn` CLI (`npx shadcn add https://neobrutalism.com/r/...`), but those are web-only, built on Radix UI / Base UI — both need a DOM and can't run in React Native. Hence the hand-written token setup here rather than a CLI install.

Still deferred: shared component primitives (buttons, cards, inputs) built against these tokens, and dark-mode theming (no dark-mode toggle mechanism exists yet).

## Firestore rules & indexes

`packages/firestore-config/firestore.rules` establishes the pattern: a wildcard `isAdmin()` bypass at the top (for the FireCMS backoffice, via a custom `admin` auth claim) followed by explicit per-collection rules for the mobile app's own access — collections are never left world-readable/writable by omission. Rules are OR'ed, so a per-collection rule only ever *adds* to what the `isAdmin()` bypass already grants — `allow update, delete: if false` under it means "moderators only", not "nobody". `v1_questions` shows the shape: an author may create their own proposal (`status` forced to `pending`, 2–6 options) and read it back, and nothing else. `firestore.indexes.json` is empty; add composite indexes as Firestore's emulator/console error messages require them (copy the definition from the error, don't hand-write it).

## Environments

Two Firebase projects, aliased in `.firebaserc`:

- `default` → `statowrel-dev`
- `production` → `statowrel-prod`

`npm run deploy:*` scripts switch project via `firebase use` before deploying and switch back to `default` afterward for the `:production` variants, mirroring planexplora-hub's convention.

## What's deliberately not here yet

- No app screens beyond the placeholder route — nothing consumes `v1_questions` on mobile yet.
- Only one of the PRD's five collections exists. `v1_users`, `v1_users/{id}/friends`, `v1_daily_questions` and its `answers` sub-collection are still to be modelled — see `docs/prd.md` §5.
- No design-system component primitives (buttons, cards, inputs) — the neobrutalism theme tokens exist in `tailwind.config.js`, the primitives are the next step. No dark-mode theming either.
- No shared React-hooks package (a `@repo/firebase-react` equivalent) — introduce one only once real duplication appears between `apps/app` and `apps/firecms`.
- No tests — matches the rest of the org's convention; do not add test infrastructure without explicit discussion.
