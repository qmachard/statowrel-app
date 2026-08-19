# StatOwrel — Architecture

Status: **early**. This document describes the monorepo's tooling, structure, and conventions — not a finished product. Four of the PRD's five collections (`v1_questions`, `v1_daily_questions`, `v1_daily_question_answers`, `v1_users`) and their FireCMS collections exist, and the app has its sign-in flow; every other screen is still to come, as is the backend owning the daily cycle. The rest is added incrementally on top of this foundation.

## Stack

| Layer | Choice | Notes |
|---|---|---|
| Monorepo | Turborepo + npm workspaces | npm only — never yarn/pnpm/bun |
| Language | TypeScript 5.4+ | Strict mode everywhere |
| Mobile app | React Native + Expo (managed workflow) + EAS | iOS + Android from one codebase |
| Mobile styling | Nativewind (Tailwind CSS for RN) | Neobrutalism design tokens in `tailwind.config.js`; `Button` / `TextField` primitives in `src/components/`, the rest added as screens need them |
| Mobile routing | Expo Router | File-based, `apps/app/app/` |
| Backoffice | React 18 + Vite (SPA) + FireCMS v2 + MUI | Firebase-Hosting-deployed admin UI |
| Backend | Firebase Cloud Functions v2 (gen2) + Express 5 | Domain-driven structure, HTTP + Firestore triggers |
| Database | Firebase Firestore | NoSQL, event-sourcing-friendly, `v1_` collection prefix |
| Auth | Firebase Auth | Client SDK on mobile (`firebase`, not `@react-native-firebase`), Admin SDK in functions. Google/Apple credentials come from native SDKs — see "Authentication" below |
| Storage | Firebase Storage | Rules in `packages/firestore-config/storage.rules` |

## Why the Firebase client SDK on mobile (not `@react-native-firebase`)

`@statowrel/models`'s Firestore converters are written against the `firebase/firestore` (client) and `firebase-admin/firestore` (admin) type surfaces — see `UniversalTimestamp`/`UniversalGeoPoint`/`UniversalSnapshot` in `packages/models/src/commons.ts`. Using the JS `firebase` SDK in `apps/app` means the exact same converter file works unchanged on mobile, in `apps/firecms`, and (via the admin variant) in `apps/functions` — one model, one converter, three consumers. It also means Firestore/Auth themselves require no native module linking. Development nonetheless runs on a custom dev client (`expo-dev-client`, `development` EAS profile) rather than Expo Go.

The tradeoff: no `@react-native-firebase`-specific features (e.g. some background/offline behaviors are weaker on the JS SDK). Revisit this decision if a specific feature requires it — the prebuild/dev-client requirement is already in place, so the cost would mainly be rewriting the converters' client type surface.

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

### `v1_questions`

`packages/models/src/v1_question.ts` — collections are plural, the model file that describes one document is singular. The pot of questions users propose and moderators approve — see `docs/prd.md` §4.7 and §6.

| Field | Type | Notes |
|---|---|---|
| `label` | `string` | e.g. "Ton dentifrice, tu le presses…" |
| `options` | `{ id, label, stat_label }[]` | 2 to 6 entries, in display order — `label` is shown ("Par le bout"), `stat_label` is the StatOwrel earned ("méthodique") |
| `status` | `'pending' \| 'approved' \| 'rejected' \| 'used'` | moderation lifecycle; `used` questions are never redrawn |
| `author_id` | `string` | credited on the question screen once drawn |
| `rejection_reason` | `string \| null` | sent back to the author; set only when `rejected` |
| `created_at` | `UniversalTimestamp` | |

### `v1_daily_questions`

`packages/models/src/v1_daily_question.ts` — one document per day: the question pushed to the app and the running tally of answers to it — see `docs/prd.md` §6.

| Field | Type | Notes |
|---|---|---|
| `date` | `string` (`YYYY-MM-DD`) | same value as the document id, carried as a field so it can be ordered/filtered on |
| `question_id` | `string` | document id in `v1_questions`; that question's `status` becomes `used` when drawn |
| `published_at` | `UniversalTimestamp` | when the question was pushed to the app; the drop time varies day to day |
| `closes_at` | `UniversalTimestamp` | Paris midnight — past it an answer is `late` and no longer counts for the streak |
| `answer_counts` | `Record<option_id, number>` | incremented via `FieldValue.increment()` on the fixed path `answer_counts.{option_id}`, so two simultaneous answers can't overwrite each other; an option with no answer yet is absent, not `0` |

The document id is the `YYYY-MM-DD` day key, not a ULID: the app reads today's question by building the id instead of querying for it, and the scheduler that draws tomorrow's question can `set()` the same day twice without ever creating it twice. Day keys are computed with `dailyQuestionDateKey()` (Europe/Paris), never `toISOString().slice(0, 10)` — that reads the UTC day, so anything between Paris midnight and 2am lands on the day before.

### `v1_daily_question_answers`

`packages/models/src/v1_daily_question_answer.ts` — sub-collection of `v1_daily_questions`, path `v1_daily_questions/{date}/v1_daily_question_answers/{user_id}`.

It carries the `v1_` prefix *and* its parent's name, which a sub-collection might look like it can skip. It cannot: a collection group is global to the database and keyed by the last path segment alone. A bare `answers` would collide with any other `answers` sub-collection the model grows later — the calendar's group query, its index and its recursive-wildcard rule would silently span both — and there would be no way to version this one on its own.

| Field | Type | Notes |
|---|---|---|
| `user_id` | `string` | Firebase Auth UID of the author, same value as the document id |
| `date` | `string` (`YYYY-MM-DD`) | denormalized from the parent document's id |
| `option_id` | `string` | the picked option's id, never its position in the array |
| `answered_at` | `UniversalTimestamp` | |
| `late` | `boolean` | true for a catch-up answer, given after the day closed |

The document id is the author's Auth UID, which makes "one answer per person per day" a property of the path rather than a check: a second answer is a write to an existing document, so it's an `update`, and `firestore.rules` denies those — `answer_counts` can never be double-counted. `date` is denormalized from the parent id so the Stats calendar reads a month of the current user's answers as one collection-group query instead of a client-side join against that month's daily questions; a day's date never changes, so the copy never goes stale.

**Why answers live under the day and not under the user.** `answer_counts` needs a parent document to increment on a fixed path — there's no such path if the answer lives under `v1_users`. The day screen also needs every friend's answer to one question in one query, which is only cheap when they share a parent. And the privacy boundary lands per day: reading a friend's answer never exposes their whole history, because a read is scoped to one `v1_daily_questions/{date}/v1_daily_question_answers` collection at a time.

### `v1_users`

`packages/models/src/v1_user.ts` — the app user's profile and answering stats. The document id is the **Firebase Auth UID**, not a ULID: it is the key `author_id`, `user_id` and friendships point at, and the one `firestore.rules` compares against `request.auth.uid`.

| Field | Type | Notes |
|---|---|---|
| `display_name` | `string` | pseudo, unique, chosen at first sign-in |
| `photo_url` | `string \| null` | avatar; `null` until the user picks one |
| `email` | `string \| null` | mirrored from Firebase Auth, which stays the source of truth |
| `auth_providers` | `AuthProviderId[]` | `password` / `google.com` / `apple.com` / `facebook.com`, mirrored from Auth at each sign-in |
| `created_at` | `UniversalTimestamp` | |
| `updated_at` | `UniversalTimestamp` | bumped on every profile write |
| `streak_count` | `number` | consecutive days answered on time; backend-owned — the answer trigger bumps it, the midnight scheduler resets it to 0 for whoever didn't answer, and a catch-up answer never restores it |
| `streak_best` | `number` | longest `streak_count` ever reached |
| `streak_last_answered_on` | `string \| null` (`YYYY-MM-DD`) | day of the last on-time answer; `null` until the first one |

The profile half of the document is written by the app itself, at first sign-in — `apps/app/src/auth/profile.ts`, under the owner-only `create`/`update` rules. The streak fields belong to the backend and the app never writes them. Only the PRD's `invite_code` is still to be modelled.

Two things to keep straight about the options:

- **An option's identity is its `id`, never its position in the array.** An answer stores an `option_id`, and `v1_daily_questions.answer_counts` increments `answer_counts.{option_id}` via `FieldValue.increment()` on a fixed path — that map stays keyed by option id precisely so two simultaneous answers can't overwrite each other. Reordering or reformulating an option must leave its `id` alone; use `findQuestionOption()` to resolve one, never an index.
- **Ids are ULIDs, minted client-side** — in the app as the author types, in the backoffice at save (`onPreSave`). No server round-trip for an id, and ids sort by creation date. FireCMS also uses ULIDs for the *document* ids of every collection, via the shared `ulidEntityId` callback.

`options` is a plain array rather than a map keyed by id: the array order *is* the display order, which removes the `position` field and lets FireCMS's built-in repeat field handle reordering.

There is no `is_multiple` flag: v1 is single-choice only, and multiple-answer questions are explicitly out of scope (`docs/prd.md` §7).

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

FireCMS v2 SPA. `src/collections/index.ts` is an `EntityCollectionsBuilder` returning the `EntityCollection` definitions for the logged-in user. Each collection is added as its own file once the corresponding model exists in `@statowrel/models`, using that model's `*_COLLECTION` constant, then registered in the index. `src/collections/v1_questions.ts` is the first one; a collection file is named after the collection itself, plural.

Two things to know when writing a collection:

- **FireCMS does not use our converters.** It reads Firestore through its own data source, which maps `Timestamp` → `Date`. So a collection is typed against a local variant of the model's `*Data` type with `Date` timestamps, not against `*Data` itself.
- **Document ids are ULIDs**, not Firestore auto-ids: wire `onIdUpdate: ulidEntityId` (from `src/collections/entityId.ts`) into every collection. `src/collections/v1_daily_questions.ts` is the second collection keyed by something else — its id follows the `date` field instead — and the first real instance of a dynamic-keyed map: `answer_counts` is keyed by option ULIDs, so its local entity type widens FireCMS's `keyValue` map value type (`Record<string, CMSType>`) rather than dropping the field.
- **Collection-level invariants live in `callbacks.onPreSave`.** The backoffice writes as an admin, and the wildcard `isAdmin()` rule lets those writes through unchecked — so the 2–6 options rule, "a rejected question needs a reason", and minting each option's ULID all happen there as well as in `firestore.rules`.

`src/authenticator/admin.ts` is the sign-in gate: it refreshes the ID token and rejects anyone without the custom `admin` auth claim — the same claim `firestore.rules`' `isAdmin()` checks, so the backoffice UI and the rules agree on who is an admin. The claim itself is granted server-side; there is no client-side way to obtain it.

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

### Authentication

Firebase Auth, three methods offered at the same level (`docs/prd.md` §4.1). The JS `firebase` SDK owns the *session* everywhere; the two social providers only exist to hand it a credential:

| Provider | How the credential is obtained |
|---|---|
| Email / password | `createUserWithEmailAndPassword` — the address is not verified, on purpose (`docs/prd.md` §4.1) |
| Google | `@react-native-google-signin/google-signin` → `idToken` → `GoogleAuthProvider.credential()` |
| Apple | `expo-apple-authentication` → `identityToken` → `new OAuthProvider('apple.com').credential()` |

**Why the native Google SDK and not `expo-auth-session`.** `signInWithPopup` has no meaning in React Native, so a credential has to come from somewhere else. `expo-auth-session` would drive the OAuth dance in a web view; the native SDK is what Expo's own Google-authentication guide recommends, gives a first-party account picker, and returns an id token directly. The cost is a config plugin (`iosUrlScheme`, the reversed iOS client id) — acceptable since CNG and `expo-dev-client` are already in place. The plugin is added only when `EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME` is set, so a checkout without Google credentials still runs; the button then hides itself.

**Apple and the nonce.** A raw nonce is generated with `expo-crypto`; its SHA-256 goes to Apple, the raw one to Firebase, which re-hashes it to check the token was minted for this request. Apple also returns the user's name on the *first* authorization only — never again, and never through Firebase Auth — so it is captured before the sign-in call (`src/auth/profileHints.ts`) and consumed when the profile document is created.

```
apps/app/
├── app/
│   ├── _layout.tsx          # AuthProvider + splash held until the session resolves
│   ├── (auth)/              # sign-in, sign-up — redirects to / as soon as a session exists
│   └── index.tsx            # protected; redirects to /sign-in without a session
└── src/
    ├── auth/                # AuthContext, providers, profile, schemas, errors
    ├── components/          # Button, TextField — the first neobrutalism primitives
    └── lib/firestore.ts     # getDocumentRef / getCollectionRef, converter-wired
```

`src/auth/profile.ts` is what makes an account real: on every sign-in it upserts `v1_users/{uid}` — **document id = Firebase Auth UID** — pre-filling the pseudo from the provider, then Apple's given name, then the email's local part. It reads before writing, so it is idempotent and cheap on a session restore, and it carries `created_at` over untouched because `firestore.rules` refuses an update that changes it.

`src/lib/firestore.ts` mirrors `apps/functions/src/libs/firebase-admin.ts` on the client side: every ref is built with a `@statowrel/models` converter, so no screen ever reads `snap.data()` untyped.

Forms use `react-hook-form` + `zod` (`@hookform/resolvers`), never raw `useState`. Firebase error codes are translated to French in `src/auth/errors.ts` — a user-facing string never leaks a raw `auth/*` code.

Both emulators are wired behind env vars (`EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_*`, `…_FIRESTORE_EMULATOR_*`), matching the ports in `firebase.json`.

Deliberately deferred: Facebook (PRD §4.1, no button yet), identity linking via `linkWithCredential` (the `auth/account-exists-with-different-credential` case shows an explanatory message instead), the dedicated pseudo/avatar onboarding screen (the pseudo is pre-filled automatically for now), pseudo uniqueness (needs a reserved-names collection or a backend check), and account deletion.

### Design system

**Neobrutalism** visual style (reference: [neoflux](https://neobrutalism.com/preview/templates/neoflux)) — flat saturated colors, thick black borders, hard offset shadows, no gradients or blur. Tokens live in `apps/app/tailwind.config.js`: color palette (`background`/`foreground`/`card`/`primary`/`primary-hover`/`secondary`/`muted`/`accent`/`destructive`/`border`/`input`/`ring`), `fontFamily` (`font-head` = Archivo Black, `font-sans` = Space Grotesk), `borderRadius` collapsed to `0` (except `full`), a thicker default `borderWidth` (2px), and a hard-offset, no-blur `boxShadow` scale (`xs`/`sm`/`DEFAULT`/`md`/`lg`/`xl`/`2xl`). Fonts load via `expo-font` + `@expo-google-fonts/archivo-black` + `@expo-google-fonts/space-grotesk` in `apps/app/app/_layout.tsx`, with the splash screen held until `useFonts` resolves.

neobrutalism.com's own registry ships components through the `shadcn` CLI (`npx shadcn add https://neobrutalism.com/r/...`), but those are web-only, built on Radix UI / Base UI — both need a DOM and can't run in React Native. Hence the hand-written token setup here rather than a CLI install.

Still deferred: shared component primitives (buttons, cards, inputs) built against these tokens, and dark-mode theming (no dark-mode toggle mechanism exists yet).

## Firestore rules & indexes

`packages/firestore-config/firestore.rules` establishes the pattern: a wildcard `isAdmin()` bypass at the top (for the FireCMS backoffice, via a custom `admin` auth claim) followed by explicit per-collection rules for the mobile app's own access — collections are never left world-readable/writable by omission. Rules are OR'ed, so a per-collection rule only ever *adds* to what the `isAdmin()` bypass already grants — `allow update, delete: if false` under it means "moderators only", not "nobody". `v1_questions` shows the shape: an author may create their own proposal (`status` forced to `pending`, 2–6 options) and read it back, and nothing else. `firestore.indexes.json` holds the repo's first composite index — collection group `v1_daily_question_answers`, `user_id ASC, date ASC`, `queryScope: COLLECTION_GROUP` — backing the Stats calendar's collection-group query; add further ones as Firestore's emulator/console error messages require them (copy the definition from the error, don't hand-write it).

A collection-group query is never covered by a nested `match`: it needs its own recursive-wildcard block (`match /{path=**}/v1_daily_question_answers/{user_id}`), and that block scopes reads to `resource.data.user_id` rather than the document id, because Firestore only accepts a query it can prove safe and the calendar filters on that field. That block is also why the sub-collection's name has to be globally unique — it reaches every collection bearing it, wherever it sits. Worth remembering too: an answer's `date` and `late` are checked against the parent day document via a `get()` in the per-day rule, so neither can be forged.

## Environments

Two Firebase projects, aliased in `.firebaserc`:

- `default` → `statowrel-dev`
- `production` → `statowrel-prod`

`npm run deploy:*` scripts switch project via `firebase use` before deploying and switch back to `default` afterward for the `:production` variants, mirroring planexplora-hub's convention.

## What's deliberately not here yet

- No app screens beyond sign-in and a placeholder home — nothing consumes `v1_questions` on mobile yet.
- Four of the PRD's five collections exist; only `v1_users/{id}/friends` is still to be modelled — see `docs/prd.md` §6.
- No backend to own `v1_daily_questions`/`v1_daily_question_answers`: no daily scheduler, no answer trigger to increment `answer_counts` and bump streaks, no midnight closer (docs/prd.md §6 "Backend") — and no app screens consume any of it yet. The data model landed alone, on purpose.
- Only two design-system primitives (`Button`, `TextField`), built for the auth forms — cards, chips and the rest come with the screens that need them. No dark-mode theming either.
- No shared React-hooks package (a `@repo/firebase-react` equivalent) — introduce one only once real duplication appears between `apps/app` and `apps/firecms`.
- No tests — matches the rest of the org's convention; do not add test infrastructure without explicit discussion.
