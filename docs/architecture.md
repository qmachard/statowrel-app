# StatOwrel — Architecture

Status: **early**. This document describes the monorepo's tooling, structure, and conventions — not a finished product. Four of the PRD's five collections (`v1_questions`, `v1_daily_questions`, `v1_daily_question_answers`, `v1_users`) and their FireCMS collections exist, and the app has its sign-in flow; every other screen is still to come, and the backend owns the front half of the daily cycle (drawing and scheduling) but not yet the back half (answers, streaks, closing). The rest is added incrementally on top of this foundation.

## Stack

| Layer | Choice | Notes |
|---|---|---|
| Monorepo | Turborepo + npm workspaces | npm only — never yarn/pnpm/bun |
| Language | TypeScript 5.4+ | Strict mode everywhere |
| Mobile app | React Native + Expo (managed workflow) + EAS | iOS + Android from one codebase |
| Mobile styling | Nativewind (Tailwind CSS for RN) | Neobrutalism design tokens in `src/design/tokens.js`; `Button` / `TextField` primitives in `src/components/`, the rest added as screens need them |
| Mobile routing | React Navigation 7 | Native stack only — no tab bar, Stats is the root (docs/prd.md §5.1) — declared in `apps/app/src/navigation/` |
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

### `daily-questions`

The daily cycle's first half — docs/prd.md §6, "Backend". Two Cloud Functions:

| Function | Kind | Role |
|---|---|---|
| `dailyQuestions-scheduleDailyQuestion` | Cloud Scheduler, `0 7 * * *` Europe/Paris | Draws **today's** question and queues its publication |
| `dailyQuestions-notifyDailyQuestion` | Cloud Tasks (`onTaskDispatched`) | Pushes it to everyone — **the push itself is not implemented yet** |

The scheduler draws one `approved` question at random, mints `v1_daily_questions/{today}` with `published_at` at 07:00 Paris and `closes_at` at the following Paris midnight, and flips the question to `used` with its `broadcast_at` — day document and question status in **one batch**, so a question is never consumed without the day that consumes it. Then it queues the notification task for immediate dispatch.

Drawing and publishing happen in the same run: everyone gets the same question at the same hour, and the day stays open until midnight, which is the whole answering window (docs/prd.md §4.2). `published_at` is derived from the day key rather than read off the clock, so a retry recomputes the same instant and a run delayed by a few seconds still stamps the round hour. The push still goes through Cloud Tasks instead of being sent inline: the fan-out gets its own retries and rate limit, and a failing push never makes the scheduler re-draw the day.

**Every step is idempotent**, because Cloud Scheduler retries. The day document is read before being drawn, so a retry reuses the committed draw rather than burning a second question; the notification task carries a day-derived id, so a re-enqueue is rejected by Cloud Tasks as a duplicate instead of notifying twice.

`helpers/parisTime.ts` converts a Paris wall-clock time to an instant in two passes — the offset can only be read *from* an instant, and a single pass lands on the wrong side of a DST switch. That is what keeps 07:00 and the midnight close on the right side of a DST day, which is 23 or 25 hours long.

Deploying this domain needs the scheduler's service account to hold `cloudtasks.enqueuer` and to be allowed to `actAs` the task function's service account — the notification is enqueued from code, not by an IAM-free trigger.

`src/libs/firebase-admin.ts` centralizes all Firestore/Storage access (`getDocumentRef`, `getSubCollectionRef`, `createWriteBatch`, `getAdminStorageSignedUrl`, …) — every ref is created with a `@statowrel/models` converter, never read untyped.

### Building the deployable artifact

`firebase.json` points at `apps/functions/dist`, a **generated** directory — not at the workspace itself. `npm run build` (esbuild, `scripts/build.mjs`) writes it: `index.js` plus a manifest listing only the registry dependencies.

The indirection exists because `firebase deploy` uploads the functions source directory alone and runs `npm install` on Cloud Build, with no access to the monorepo. A `@statowrel/models` entry in that manifest is fatal — it is a private workspace package the registry has never heard of, and npm fails on it whichever dependency key it sits under (`--omit=dev` still resolves dev edges). So the artifact carries no workspace reference at all: esbuild inlines `@statowrel/models` into the bundle, and everything published stays external, installed on the build machine as usual.

That also makes `@statowrel/models` a *dev* dependency of `apps/functions` — it is consumed at build time and never at runtime. The emulator runs the same bundle as production, with `--enable-source-maps` so stack traces still point at `src/`.

## `apps/firecms` — backoffice

FireCMS v2 SPA. `src/collections/index.ts` is an `EntityCollectionsBuilder` returning the `EntityCollection` definitions for the logged-in user. Each collection is added as its own file once the corresponding model exists in `@statowrel/models`, using that model's `*_COLLECTION` constant, then registered in the index. `src/collections/v1_questions.ts` is the first one; a collection file is named after the collection itself, plural.

Two things to know when writing a collection:

- **FireCMS does not use our converters.** It reads Firestore through its own data source, which maps `Timestamp` → `Date`. So a collection is typed against a local variant of the model's `*Data` type with `Date` timestamps, not against `*Data` itself.
- **Document ids are ULIDs**, not Firestore auto-ids: wire `onIdUpdate: ulidEntityId` (from `src/collections/entityId.ts`) into every collection. `src/collections/v1_daily_questions.ts` is the second collection keyed by something else — its id follows the `date` field instead — and the first real instance of a dynamic-keyed map: `answer_counts` is keyed by option ULIDs, so its local entity type widens FireCMS's `keyValue` map value type (`Record<string, CMSType>`) rather than dropping the field.
- **Collection-level invariants live in `callbacks.onPreSave`.** The backoffice writes as an admin, and the wildcard `isAdmin()` rule lets those writes through unchecked — so the 2–6 options rule, "a rejected question needs a reason", and minting each option's ULID all happen there as well as in `firestore.rules`.

`src/authenticator/admin.ts` is the sign-in gate: it refreshes the ID token and rejects anyone without the custom `admin` auth claim — the same claim `firestore.rules`' `isAdmin()` checks, so the backoffice UI and the rules agree on who is an admin. The claim itself is granted server-side; there is no client-side way to obtain it.

## `apps/app` — mobile

Expo managed workflow, React Navigation for navigation, Nativewind for styling. `app.config.ts` is a dynamic config keyed off `APP_VARIANT` (`development` | `preview` | `production`) so the three EAS build profiles produce distinct app names / bundle identifiers / package names — dev, preview, and production builds can be installed side-by-side on the same device.

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

**Neobrutalism** visual style (reference: [neoflux](https://neobrutalism.com/preview/templates/neoflux)) — flat saturated colors, thick black borders, hard offset shadows, no gradients or blur. The palette lives in `apps/app/src/design/tokens.js` — CommonJS, so `tailwind.config.js` can `require()` it while TypeScript imports the same values for the parts React Navigation paints itself (container theme, tab bar, stack `contentStyle`). That module also owns the `borderRadius` scale (corners are rounded rather than square — the border and the shadow carry the brutalism, so the ladder runs 8/12/16/20/24/32px from `sm` to `2xl`, `full` still available) and the hard-offset, no-blur `boxShadow` scale (`xs`/`sm`/`DEFAULT`/`md`/`lg`/`xl`/`2xl`). `apps/app/tailwind.config.js` holds the rest: color palette (`background`/`foreground`/`card`/`primary`/`primary-hover`/`secondary`/`secondary-hover`/`muted`/`accent`/`accent-hover`/`destructive`/`border`/`input`/`ring`) — four tokens carry the identity, black text on a cream `background`, a yellow `primary` for the main action and a saturated red `accent` for the accentuated one, which is why `accent` is the only surface taking white text, `fontFamily` (`font-head` = Archivo Black, `font-sans` = Space Grotesk), and a thicker default `borderWidth` (2px).

Components apply the shadows through `apps/app/src/design/shadows.ts` rather than Nativewind's `shadow-*` classNames. Those compile down to the *legacy* iOS shadow props (`shadowOffset` / `shadowRadius` / `shadowOpacity`, plus `elevation` on Android), which stop reproducing a CSS box-shadow faithfully once a surface has a corner radius — the edge softens, which defeats the point of a neobrutalist shadow. `shadows.ts` hands React Native the CSS `boxShadow` string (RN 0.76+) instead, so a `0` blur radius stays a `0` blur radius. Same token strings feed both. Fonts load via `expo-font` + `@expo-google-fonts/archivo-black` + `@expo-google-fonts/space-grotesk` in `apps/app/src/App.tsx`, with the splash screen held until `useFonts` resolves.

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

The deploy scripts run the Firebase CLI directly (`npm run deploy --workspace=…`) rather than through turbo. A deploy asks questions — enabling an API, setting an Artifact Registry cleanup policy — and turbo does not forward stdin to the tasks it runs, so those prompts hang unanswered. Turbo has an `interactive` task flag, but it only works under the full-screen `tui` renderer, which is not worth imposing on every `dev` and `build` run for this. It buys nothing here either: the deploy tasks were uncached and dependency-free, and `deploy:firecms` already called the CLI directly.

## What's deliberately not here yet

- The Stats screen (docs/prd.md §5.2) renders from fixtures, not Firestore — `apps/app/src/stats/data/` holds two fake data sets and the `__DEV__` switch between them. Nothing consumes `v1_questions` on mobile yet, and the calendar's cells are not tappable: the question sheet (§5.4) and the StatOwrel card (§5.5) they open do not exist.
- Four of the PRD's five collections exist; only `v1_users/{id}/friends` is still to be modelled — see `docs/prd.md` §6.
- The daily cycle's back half: no answer trigger to increment `answer_counts` and bump streaks, no midnight closer resetting the streaks of whoever didn't answer (docs/prd.md §6 "Backend"). The push `dailyQuestions-notifyDailyQuestion` sends is a stub too — the task fires, it just doesn't notify anyone yet. And no app screen consumes any of it.
- Design-system primitives are added as screens need them — `Button`, `TextField`, `Card`, `IconButton`, `Calendar` so far. No dark-mode theming either (light only).
- No shared React-hooks package (a `@repo/firebase-react` equivalent) — introduce one only once real duplication appears between `apps/app` and `apps/firecms`.
- No tests — matches the rest of the org's convention; do not add test infrastructure without explicit discussion.
