# StatOwrel — Architecture

Status: **early**. This document describes the monorepo's tooling, structure, and conventions — not a finished product. Four of the PRD's collections (`v1_questions`, its `v1_daily_question_answers` sub-collection, `v1_users`, `v1_usernames`) exist, and the app has its sign-in flow; every other screen is still to come, and the backend owns the front half of the daily cycle (drawing and scheduling) but not yet the back half (answers, streaks, closing). The rest is added incrementally on top of this foundation.

## Stack

| Layer | Choice | Notes |
|---|---|---|
| Monorepo | Turborepo + npm workspaces | npm only — never yarn/pnpm/bun |
| Language | TypeScript 5.4+ | Strict mode everywhere |
| Mobile app | React Native + Expo (managed workflow) + EAS | iOS + Android from one codebase |
| Mobile styling | React Native `StyleSheet` | Neobrutalism design tokens in `src/design/tokens.ts`; `Button` / `TextField` / `Card` / `Calendar` / `BottomSheet` primitives in `src/components/`, the rest added as screens need them |
| Mobile routing | React Navigation 7 | Native stack only — no tab bar, Stats is the root (docs/prd.md §5.1) — declared in `apps/app/src/navigation/` |
| Moderation console | React 18 + Vite (SPA) | `apps/admin` — plain client SDK, no CMS framework; neobrutalism tokens ported from the app |
| Backend | Firebase Cloud Functions v2 (gen2) + Express 5 | Domain-driven structure, HTTP + Firestore triggers |
| Database | Firebase Firestore | NoSQL, event-sourcing-friendly, `v1_` collection prefix |
| Auth | Firebase Auth | Client SDK on mobile (`firebase`, not `@react-native-firebase`), Admin SDK in functions. Google/Apple credentials come from native SDKs — see "Authentication" below |
| Storage | Firebase Storage | Rules in `packages/firestore-config/storage.rules` |

## Why the Firebase client SDK on mobile (not `@react-native-firebase`)

`@statowrel/models`'s Firestore converters are written against the `firebase/firestore` (client) and `firebase-admin/firestore` (admin) type surfaces — see `UniversalTimestamp`/`UniversalGeoPoint`/`UniversalSnapshot` in `packages/models/src/commons.ts`. Using the JS `firebase` SDK in `apps/app` means the exact same converter file works unchanged on mobile and (via the admin variant) in `apps/functions` — one model, one converter, two consumers. It also means Firestore/Auth themselves require no native module linking. Development nonetheless runs on a custom dev client (`expo-dev-client`, `development` EAS profile) rather than Expo Go.

The tradeoff: no `@react-native-firebase`-specific features (e.g. some background/offline behaviors are weaker on the JS SDK). Revisit this decision if a specific feature requires it — the prebuild/dev-client requirement is already in place, so the cost would mainly be rewriting the converters' client type surface.

## Monorepo layout

```
statowrel-app/
├── apps/
│   ├── app/          # React Native + Expo + EAS — the mobile app
│   ├── admin/        # React + Vite — question moderation console
│   └── functions/     # Firebase Cloud Functions v2 + Express 5 — backend
├── packages/
│   ├── models/                # @statowrel/models — TS models + Firestore converters
│   └── firestore-config/      # @statowrel/firestore-config — rules + indexes
├── docs/
│   └── architecture.md        # this file
├── firebase.json              # functions + firestore + storage + hosting config
├── .firebaserc                # `default` / `production` Firebase project aliases
├── turbo.json
└── package.json
```

### Dependency graph

```
apps/app ──────┐
apps/admin ────┼──► @statowrel/models ──► firebase / firebase-admin (types only, per SDK)
apps/functions ┘
```

`@statowrel/firestore-config` has no code dependents — it's deployed standalone via the Firebase CLI (`firebase deploy --only firestore:rules,firestore:indexes,storage`).

## `@statowrel/models`

Single source of truth for Firestore data shapes, shared by both apps. `src/commons.ts` provides the SDK-agnostic infrastructure:

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

`packages/models/src/v1_question.ts` — collections are plural, the model file that describes one document is singular. The pot of questions users propose and moderators approve, **and the day each drawn one ran** — see `docs/prd.md` §4.7 and §6.

| Field | Type | Notes |
|---|---|---|
| `label` | `string` | e.g. "Ton dentifrice, tu le presses…" |
| `options` | `{ id, label, stat_label }[]` | 2 to 6 entries, in display order — `label` is shown ("Par le bout"), `stat_label` is the StatOwrel earned ("méthodique") |
| `status` | `'pending' \| 'approved' \| 'rejected' \| 'used'` | moderation lifecycle; `used` questions are never redrawn |
| `author_id` | `string` | credited on the question screen once drawn |
| `rejection_reason` | `string \| null` | sent back to the author; set only when `rejected` |
| `broadcast_at` | `UniversalTimestamp \| null` | the 07:00 Paris instant it dropped; null until drawn |
| `broadcast_on` | `string \| null` (`YYYY-MM-DD`) | the Paris day that instant falls on; null until drawn |
| `closes_at` | `UniversalTimestamp \| null` | Paris midnight — past it an answer is `late` and no longer counts for the streak; null until drawn |
| `answer_counts` | `Record<option_id, number>` | incremented via `FieldValue.increment()` on the fixed path `answer_counts.{option_id}`, so two simultaneous answers can't overwrite each other; an option with no answer yet is absent, not `0` |
| `created_at` | `UniversalTimestamp` | |

**There is no per-day document.** A drawn question *is* the day: it carries when it dropped, when it closes and what people picked, and the answers hang off it as a sub-collection. `v1_daily_question_months` below is what maps a calendar day to the question that ran it — one read a month instead of one document a day — and `broadcast_on` is the reverse of that pointer. Day keys are computed with `dailyQuestionDateKey()` (Europe/Paris), never `toISOString().slice(0, 10)` — that reads the UTC day, so anything between Paris midnight and 2am lands on the day before.

`broadcast_on` duplicates what `broadcast_at` already says, and it earns its place: nothing that reads this document can turn a timestamp into a Paris day key without a clock and a timezone database, `firestore.rules` least of all — and the rules are what pin an answer's `date` to the day it was really given, so a forged one cannot land on the wrong calendar cell or restart the wrong streak. `closes_at` is stored for the same reason: it is what the rules check the `late` flag against.

### `v1_daily_question_answers`

`packages/models/src/v1_daily_question_answer.ts` — sub-collection of `v1_questions`, path `v1_questions/{question_id}/v1_daily_question_answers/{user_id}`.

It carries the `v1_` prefix *and* a globally unique name, which a sub-collection might look like it can skip. It cannot: a collection group is global to the database and keyed by the last path segment alone. A bare `answers` would collide with any other `answers` sub-collection the model grows later — the calendar's group query, its index and its recursive-wildcard rule would silently span both — and there would be no way to version this one on its own. The name says `daily_question` rather than echoing its parent because what it holds is an answer to the question *as the daily question*: only a broadcast question has any.

| Field | Type | Notes |
|---|---|---|
| `user_id` | `string` | Firebase Auth UID of the author, same value as the document id |
| `question_id` | `string` | denormalized from the parent document's id |
| `date` | `string` (`YYYY-MM-DD`) | copied from the parent question's `broadcast_on` |
| `option_id` | `string` | the picked option's id, never its position in the array |
| `answered_at` | `UniversalTimestamp` | |
| `late` | `boolean` | true for a catch-up answer, given after the day closed |

The document id is the author's Auth UID, which makes "one answer per person per day" a property of the path rather than a check — one question is one day: a second answer is a write to an existing document, so it's an `update`, and `firestore.rules` denies those — `answer_counts` can never be double-counted. `question_id` and `date` are denormalized so an answer read on its own carries what it answers and when: the trigger projects it into the two monthly documents below without a second read, and a group query over one user's answers (a rebuild, an export) can filter on the day. A question is broadcast once and never rebroadcast, so the copy never goes stale.

**Why answers live under the question and not under the user.** `answer_counts` needs a parent document to increment on a fixed path — there's no such path if the answer lives under `v1_users`. The day screen also needs every friend's answer to one question in one query, which is only cheap when they share a parent. And the privacy boundary lands per day: reading a friend's answer never exposes their whole history, because a read is scoped to one `v1_questions/{question_id}/v1_daily_question_answers` collection at a time, and a question ran a single day.

### `v1_daily_question_months` and `v1_user_calendar_months`

`packages/models/src/v1_daily_question_month.ts` and `src/v1_user_calendar_month.ts` — the read model behind the Stats calendar (`docs/prd.md` §5.2). One document per calendar month each, keyed `YYYY-MM`, both holding a `days` map keyed by day of the month (`'01'`…`'31'`) so a merge on `days.{DD}` never rewrites the rest of the month. `monthKeyOf()` / `monthDayKeyOf()` turn a `YYYY-MM-DD` day key into that pair of coordinates.

| Collection | Scope | Written by | Holds, per day |
|---|---|---|---|
| `v1_daily_question_months/{YYYY-MM}` | shared, one per month for everybody | the daily scheduler, in the same batch that stamps the question | `question_id` and `label` — the question broadcast that day |
| `v1_users/{uid}/v1_user_calendar_months/{YYYY-MM}` | private to one user | the answer trigger, in the transaction that bumps their counters | `option_id`, `stat_label`, `late` |

The shared half is also the daily cycle's index: since a drawn question *is* the day, `days.{DD}.question_id` is the only thing that maps a calendar day to it, and reading today's question starts here. The Stats screen's daily-question banner (docs/prd.md §5.2) rides on the same two documents: the `label` copied onto the month index is what it announces, and "already answered" is a day of the user's own month. A banner that would otherwise be two reads on every app opening — the day, then its question — comes free with the calendar.

The shared half also carries the calendar's **lower bound**: one ordered `limit(1)` query on `v1_daily_question_months` gives the first month a question was ever broadcast in, and that is how far back the chevrons go. Deliberately not the registration month — a day older than the account is a missed day like any other, answerable in catch-up (docs/prd.md §4.2), so the archive is bounded by the questions and is the same for everybody. One read per session, since the first month never moves.

**Why they exist.** Displaying one month of calendar from the answers alone costs, per month browsed: one read per answered day, plus a lookup per day to tell a **missed** day from a day that never had a question — dozens of reads, and again on every chevron. Read from the two monthly documents it costs **two**, and one once the shared half is cached.

**They are derived, never the truth.** The answers under `v1_questions` stay the source; these are a projection, and rebuilding one from its answers must always be possible. Two consequences to keep in mind: the `stat_label` copy goes stale if a moderator edits the question behind it — nothing renders it since the answered cell became a check (`docs/prd.md` §5.2) and the card of §5.5 reads the real question, so the drift is invisible for now, but it is there — and the projection can only be as complete as the trigger that fills it — see "What's deliberately not here yet".

Only the shared half is immutable: a month of `v1_daily_question_months` is frozen once the month is over, which is what makes it safe to cache on the client indefinitely. A user's own month is not — a catch-up answer (`docs/prd.md` §4.2) adds an entry to a month long closed.

### `v1_users`

`packages/models/src/v1_user.ts` — the app user's profile and answering stats. The document id is the **Firebase Auth UID**, not a ULID: it is the key `author_id`, `user_id` and friendships point at, and the one `firestore.rules` compares against `request.auth.uid`.

| Field | Type | Notes |
|---|---|---|
| `username` | `string` | handle, unique app-wide, typed on the onboarding sheet — never pre-filled from a provider; `v1_usernames` below is what makes it unique |
| `photo_url` | `string \| null` | avatar; `null` until the user picks one |
| `email` | `string \| null` | mirrored from Firebase Auth, which stays the source of truth |
| `auth_providers` | `AuthProviderId[]` | `password` / `google.com` / `apple.com` / `facebook.com`, mirrored from Auth at each sign-in |
| `created_at` | `UniversalTimestamp` | |
| `updated_at` | `UniversalTimestamp` | bumped on every profile write |
| `streak_count` | `number` | consecutive days answered on time; backend-owned — the answer trigger bumps it, the midnight scheduler resets it to 0 for whoever didn't answer, and a catch-up answer never restores it |
| `streak_best` | `number` | longest `streak_count` ever reached |
| `answers_count` | `number` | total days answered, catch-ups included — days predating the account among them, which is why the Stats tile is labelled « Total » over « jours » and not « depuis l'inscription ». The tile reads the field rather than counting, since the calendar only ever loads one month |
| `streak_last_answered_on` | `string \| null` (`YYYY-MM-DD`) | day of the last on-time answer; `null` until the first one |

The profile half of the document is written by the app itself, at first sign-in — `apps/app/src/auth/profile.ts`, under the owner-only `create`/`update` rules. The counters belong to the backend: the app seeds them at sign-up and `firestore.rules` rejects an update that moves one, so a forged score is not a thing a client can write. Only the PRD's `invite_code` is still to be modelled.

### `v1_usernames`

`packages/models/src/v1_username.ts` — one document per taken handle, **the document id being the handle itself**, carrying `user_id` (the holder's Auth UID) and `created_at`.

**Why a collection and not a uniqueness check.** Firestore has no unique index, and no query can be made atomic against a concurrent one — two people submitting `lou` at the same moment would both find it free. A `create` on a document that already exists is denied by Firestore itself, though, so making the handle the *document id* turns uniqueness into a property of the path: the loser of the race gets `permission-denied`, not a duplicate. It is also the lookup that resolves a `@handle` to an account when a friend is added by username (`docs/prd.md` §4.1), which is why `get` is open to any signed-in user while `list` is denied — resolving a handle you already know is not browsing a directory.

The reservation is written *before* the profile, never in the same batch: `firestore.rules` checks the profile's `username` against this collection with a `get()`, and rules evaluate each write of a batch against the state that preceded it — a reservation created in the same batch would still be invisible. The two writes are therefore sequential, and re-writing a reservation one already holds is allowed so a retry after a failed profile write goes through. An abandoned onboarding can leave a reservation with no profile behind it; freeing one is a backend job, alongside account deletion.

### `v1_user_friends`

`packages/models/src/v1_user_friend.ts` — sub-collection of `v1_users`, path `v1_users/{user_id}/v1_user_friends/{friend_id}`, one half of a friendship (`docs/prd.md` §4.1).

| Field | Type | Notes |
|---|---|---|
| `user_id` | `string` | Auth UID of the list's owner, denormalized from the parent id — the side this half is seen from |
| `friend_id` | `string` | Auth UID of the friend, same value as the document id |
| `friend_username` | `string` | the friend's handle, copied from their profile at write time |
| `status` | `'pending' \| 'accepted'` | no `declined` and no `blocked`: refusing deletes the pair, blocking is out of scope (`docs/prd.md` §7) |
| `requested_by` | `string` | Auth UID of whoever sent the invitation — **the same value on both halves** |
| `created_at` | `UniversalTimestamp` | when the invitation was sent |
| `accepted_at` | `UniversalTimestamp \| null` | `null` while pending |

The document id is the *other* user's Auth UID, which makes "at most one friendship per pair" a property of the path: inviting the same person twice is a write to an existing document, and there is nothing to query to find out.

**Why two documents, both written at the invitation.** A friendship is reciprocal (`docs/prd.md` §4.1 — no asymmetric follow), so it is mirrored under each user. The PRD sketches the mirror as written *at acceptance*; it is written from the invitation instead, because otherwise "who invited me" would be a collection-group query over everybody's friends — and a `list` rule loose enough to allow it would also let anyone browse who is friends with whom. With the mirror, the invitee's own list is enough, and reading stays `isOwner(user_id)`.

**Why direction is not stored.** `requested_by` is identical on both halves and `friendshipDirectionOf()` derives `outgoing` / `incoming` from it, so the two mirrors cannot end up disagreeing on who invited whom — the failure mode a per-side `direction` field would invite. It is also what the rules check to reject accepting one's own invitation.

**Who writes.** The acting client, both halves in one batch — the inviter at creation, the invitee at acceptance — with no backend involved, like the `v1_usernames` reservation. `firestore.rules` lets a signed-in user write the entry in their own list *and* the entry carrying their own UID as its id, which is exactly the two halves of a pair they are part of: an invitation always starts `pending` and always from its sender, an update only moves `pending` → `accepted` and never by the sender, and a refusal, a cancellation and a removal are the same `delete`. A client that writes only one half of a pair leaves a cosmetic desync — one side accepted, the other pending — that a repair job can reconcile; it cannot forge a friendship anybody else can see.

**Only the handle is denormalized.** `friend_username` is copied onto the edge so rendering a friend list costs one collection read instead of one profile read per line — the same trade the calendar's `stat_label` makes. It is safe to copy because it is *checkable*: `firestore.rules` runs the same `get()` on `v1_usernames` that a profile's own `ownsUsername()` runs, so a client cannot introduce itself to somebody under a borrowed handle. Nothing else follows it — an avatar has no reservation to be checked against, and a streak (`docs/prd.md` §5.3) moves every day and would be stale on sight, so the screens that show either read the friends' `v1_users` documents, which any signed-in user may read. Renaming is not implemented yet (`docs/prd.md` §4.1); the day it is, freeing the old reservation is what has to backfill these copies. No composite index either — a friend list is small enough to be read whole and filtered on `status` client-side.

Two things to keep straight about the options:

- **An option's identity is its `id`, never its position in the array.** An answer stores an `option_id`, and `v1_questions.answer_counts` increments `answer_counts.{option_id}` via `FieldValue.increment()` on a fixed path — that map stays keyed by option id precisely so two simultaneous answers can't overwrite each other. Reordering or reformulating an option must leave its `id` alone; use `findQuestionOption()` to resolve one, never an index.
- **Ids are ULIDs, minted client-side** — in the app as the author types. No server round-trip for an id, and ids sort by creation date. Document ids follow the same rule, except where the collection is keyed by something else (`v1_users` by the Firebase Auth UID, the monthly read models by their `YYYY-MM`).

`options` is a plain array rather than a map keyed by id: the array order *is* the display order, which removes the `position` field.

There is no `is_multiple` flag: v1 is single-choice only, and multiple-answer questions are explicitly out of scope (`docs/prd.md` §7).

## `apps/functions` — domain structure

Each domain under `src/domains/` is self-contained:

```
domains/{domain-name}/
├── api/{handlers,middlewares,index.ts}   # HTTP routes — Express app + onRequest export
├── callables/                              # onCall functions — one file per callable
├── triggers/{steps,onXxxCreated.ts}       # Firestore triggers → step handlers
├── helpers/                                # business logic
├── tasks/                                  # Cloud Tasks handlers
├── schedules/                               # Cloud Scheduler handlers
└── index.ts                                 # re-exports Cloud Function registrations only
```

`src/index.ts` re-exports each domain as a namespace (`export * as health from './domains/health'`), so Firebase names functions `<domain>-<exportName>` (e.g. `health-healthApi`). `src/domains/health` is a minimal working example (`GET /ping`) proving the wiring end-to-end; it's a template to copy, not a real feature.

`api/` and `callables/` are two ways out of the same domain, and the client decides which. An **HTTP route** is for a caller that is not the app — a webhook, a browser, `curl`. A **callable** is for the app: the ID token travels with the call and is verified by the runtime, so `request.auth` is already there and no token middleware has to be written; failures come back as `HttpsError` codes the client reads as `functions/*`. A callable's wire shape (name, payload, result) lives in `@statowrel/models`'s `callables.ts` — one of the two modules of that package describing no Firestore collection, with `daily_question_time.ts` — so both sides compile against the same type.

### `daily-questions`

The daily cycle's first half — docs/prd.md §6, "Backend". Two Cloud Functions:

| Function | Kind | Role |
|---|---|---|
| `dailyQuestions-scheduleDailyQuestion` | Cloud Scheduler, `0 7 * * *` Europe/Paris | Draws **today's** question and queues its publication |
| `dailyQuestions-notifyDailyQuestion` | Cloud Tasks (`onTaskDispatched`) | Pushes it to everyone — **the push itself is not implemented yet** |

The scheduler draws one `approved` question at random, flips it to `used` and stamps its broadcast — `broadcast_at` at 07:00 Paris, `broadcast_on` today's day key, `closes_at` at the following Paris midnight — then indexes it in `v1_daily_question_months`, both in **one batch**: a question is never consumed without the month entry that points a day at it, and never broadcast without the `broadcast_on` the rules check an answer against. Then it queues the notification task for immediate dispatch.

Drawing and publishing happen in the same run: everyone gets the same question at the same hour, and the day stays open until midnight, which is the whole answering window (docs/prd.md §4.2). `broadcast_at` is derived from the day key rather than read off the clock, so a retry recomputes the same instant and a run delayed by a few seconds still stamps the round hour. The push still goes through Cloud Tasks instead of being sent inline: the fan-out gets its own retries and rate limit, and a failing push never makes the scheduler re-draw the day.

**Every step is idempotent**, because Cloud Scheduler retries. The month entry is read before a draw and is written in the same batch as it, so a retry reuses the committed draw rather than burning a second question; the notification task carries a day-derived id, so a re-enqueue is rejected by Cloud Tasks as a duplicate instead of notifying twice.

`@statowrel/models`'s `daily_question_time.ts` converts a Paris wall-clock time to an instant in two passes — the offset can only be read *from* an instant, and a single pass lands on the wrong side of a DST switch. That is what keeps 07:00 and the midnight close on the right side of a DST day, which is 23 or 25 hours long. It sits in the shared package rather than in this domain because the drop hour and the midnight close are what `broadcast_at` and `closes_at` *mean*, and the seeding script below stamps them from outside the functions runtime.

`apps/functions/scripts/seed-daily-questions.mjs` (`npm run seed-daily-questions`) is that outside caller: it replays this same batch for the days already gone — by default the five before today — so a fresh project or a reset emulator does not open on an empty calendar. It draws from the approved pot first and mints what the pot cannot cover from `scripts/questions.seed.json` — the same catalogue `seed-questions.mjs` fills the moderation pot with, skipping what is already in it — leaves alone a day already indexed in its month (so it only ever fills holes) and notifies nobody. `--answers <n>` additionally fabricates a tally on the days it seeds, off by default, and counters on the question only: no answer document is forged under anybody's UID.

Deploying this domain needs the scheduler's service account to hold `cloudtasks.enqueuer` and to be allowed to `actAs` the task function's service account — the notification is enqueued from code, not by an IAM-free trigger.

`src/libs/firebase-admin.ts` centralizes all Firestore/Storage access (`getDocumentRef`, `getSubCollectionRef`, `createWriteBatch`, `getAdminStorageSignedUrl`, …) — every ref is created with a `@statowrel/models` converter, never read untyped.

### `friends`

Adding a friend by handle — docs/prd.md §4.1. One Cloud Function:

| Function | Kind | Role |
|---|---|---|
| `friends-inviteFriend` | Callable (`onCall`) | Resolves an exact handle and writes both halves of the friendship, `pending` |

A callable rather than a trigger, and rather than a client-side write. The screen asks a question — "does this handle exist?" — which a Firestore trigger cannot answer: it fires *after* a write, and an unknown handle produces none. `firestore.rules` would in fact let the app resolve the handle itself (`v1_usernames` is `get`-able) and write both halves (`v1_user_friends` is writable from either side of the pair), but that spreads the invariants — no self-invite, no second invitation over an existing pair — across a client nobody can hold to them.

The app reads the `v1_usernames` reservation before calling, and skips the call when there is none — one document read instead of an invocation on the likeliest outcome of that screen, a typo. The callable resolves the handle again all the same: the client-side read is a shortcut, never the check.

The pair is written in one batch, both halves `pending` from the moment the invitation is sent, so the invitee sees it in their own list without a collection-group query (see `v1_user_friend.ts`). An existing pair comes back as an outcome (`already_invited` / `already_friends`) rather than an error, since nothing failed; an unknown handle, one's own handle and a malformed one are `HttpsError`s, since none of them wrote anything.

The friend list of docs/prd.md §5.3 now reads those halves, on the Menu screen (`src/friends/`) — the invitation included, since both halves exist from the moment it is sent. Answering one is written by the app rather than by a callable — there is nothing to resolve, both documents already exist, and `firestore.rules` carries the whole rule: the accept is `pending` → `accepted` on both halves, never by whoever sent the invitation, and refusing, cancelling and removing are one and the same delete of both halves.

### Building the deployable artifact

`firebase.json` points at `apps/functions/dist`, a **generated** directory — not at the workspace itself. `npm run build` (esbuild, `scripts/build.mjs`) writes it: `index.js` plus a manifest listing only the registry dependencies.

The indirection exists because `firebase deploy` uploads the functions source directory alone and runs `npm install` on Cloud Build, with no access to the monorepo. A `@statowrel/models` entry in that manifest is fatal — it is a private workspace package the registry has never heard of, and npm fails on it whichever dependency key it sits under (`--omit=dev` still resolves dev edges). So the artifact carries no workspace reference at all: esbuild inlines `@statowrel/models` into the bundle, and everything published stays external, installed on the build machine as usual.

That also makes `@statowrel/models` a *dev* dependency of `apps/functions` — it is consumed at build time and never at runtime. The emulator runs the same bundle as production, with `--enable-source-maps` so stack traces still point at `src/`.

The client `firebase` SDK sits in that same *dev* slot, for the same reason: nothing in `src/` imports it, but `@statowrel/models`' declarations reference `firebase/firestore` for the client half of their universal types, so `tsc` needs it and the deployed manifest does not.

The runtime is **nodejs22**, pinned in two places that must stay in step: `engines.node` in `apps/functions/package.json` (copied verbatim into the generated manifest, which is what Cloud Functions reads to pick the runtime) and esbuild's `target` in `scripts/build.mjs`. Node 22 is a floor, not a preference — `firebase-admin` v14 declares `engines.node >= 22` and dropped Node 18/20 outright.

## `apps/admin` — question moderation console

A plain React + Vite SPA — no CMS framework, the Firebase client SDK directly — and what stands where the FireCMS backoffice used to. It does deliberately less: FireCMS exposed every collection, this knows only `v1_questions`. The whole pot in one table, a modal to write a question or reword one, and approval a click away — the moderation flow of `docs/prd.md` §4.7. Anything else admin-shaped still happens in the Firebase console.

**No sign-up.** Accounts pre-exist — created by the mobile app or by the Firebase console — and access opens one account at a time through the `admin` custom claim (`npm run set-admin -- <email>`). `src/auth/AuthContext.tsx` is that gate: `getIdTokenResult(true)`, forcing a token refresh so an account promoted mid-session gets in without waiting out its token. It is the same claim `firestore.rules`' `isAdmin()` checks, so the UI and the rules agree on who is an admin, and the claim itself is only ever granted server-side. A session without it reaches `AccessDeniedScreen` and nothing else. Sign-in offers e-mail + password and Google; Apple is left out, since its web flow needs a Services ID and a key the mobile build does not, and nothing here is iOS.

Because every user of this interface is an admin, its reads and writes go through the wildcard `isAdmin()` bypass rather than through `v1_questions`' own rules — which is what lets one table hold the whole pot, where the author-scoped `read` would only show a moderator their own proposals. What it writes is nonetheless exactly what that `allow create` would accept — `status: 'pending'`, `author_id` the signed-in UID, `broadcast_at` / `broadcast_on` / `closes_at` left null, 2 to 6 options — so lifting the claim requirement later is a change to the gate alone.

The document id is a ULID, and so is every option's, and **an option's id is never regenerated**: an answer and its `answer_counts` entry both point at it, so an edit carries the existing id back through the form and only mints one for an option typed in for the first time. Editing and approving both go through `updateDoc` on the fields they touch, never a whole-document `set()`, which would carry back the `answer_counts` and broadcast stamps read a moment earlier and revert whatever the backend wrote in between. Rejecting is not built yet: a rejection owes its author a reason, so it needs a text field as well as a button — `setQuestionStatus` already takes the parameter.

The create/edit modal is a native `<dialog>`: the focus trap, the inert background and Escape come from the browser rather than from a component library. It is mounted only while open and keyed by what it edits, so the form is built from the right defaults instead of being reset after mounting.

`src/lib/firebase.ts` and `src/lib/firestore.ts` are the browser twins of the app's: same converter wiring, minus the React Native persistence dance — the browser build persists in `indexedDB` on its own. `src/index.css` carries the neobrutalism tokens as CSS custom properties, ported from `apps/app/src/design/tokens.ts`, which stays the source of truth.

**It deploys to Firebase Hosting**, on the project's default site. The `hosting` block in `firebase.json` serves `apps/admin/dist` and builds it itself — its `predeploy` runs `npm run build:admin` — behind the `**` → `/index.html` rewrite an SPA needs to survive a page reload. Its cache headers follow Vite's output: `/assets/**` is content-hashed, so it ships `immutable` for a year, while `**/*.html` stays `no-cache` and revalidates, without which a deploy would sit invisible behind Hosting's hour-long default on the entry document. `npm run deploy:admin` / `:production` switch project with `firebase use` like the functions and firestore scripts. No Hosting *target* is declared: there is one site, so the default one is it — a second surface (a landing page, a preview site) is what would make a target worth its `.firebaserc` entry.

The build inlines the Firebase web config, so the deploy needs `apps/admin/.env.production.local` — Vite's precedence puts it ahead of `.env.local`, which is what keeps a dev session's values out of a deployed bundle. Without it the bundle ships empty vars and the page dies on `auth/invalid-api-key`. Emulator hosts cannot leak in either: `src/lib/firebase.ts` only wires them under `import.meta.env.DEV`, which `vite build` compiles to `false`.

## `apps/app` — mobile

Expo managed workflow, React Navigation for navigation, React Native `StyleSheet` for styling. `app.config.ts` is a dynamic config keyed off `APP_VARIANT` (`development` | `preview` | `production`) so the three EAS build profiles produce distinct app names / bundle identifiers / package names — dev, preview, and production builds can be installed side-by-side on the same device.

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

**Apple and the nonce.** A raw nonce is generated with `expo-crypto`; its SHA-256 goes to Apple, the raw one to Firebase, which re-hashes it to check the token was minted for this request. Only the email scope is requested: Apple's `fullName` would be of no use, since the username is never pre-filled from a provider.

```
apps/app/
├── app/
│   ├── _layout.tsx          # AuthProvider + splash held until the session resolves
│   ├── (auth)/              # sign-in, sign-up — redirects to / as soon as a session exists
│   └── index.tsx            # protected; redirects to /sign-in without a session
└── src/
    ├── auth/                # AuthContext, providers, profile, schemas, errors, the onboarding sheet, screens (sign-in, sign-up, profile)
    ├── components/          # Button, TextField — the first neobrutalism primitives
    └── lib/firestore.ts     # getDocumentRef / getCollectionRef, converter-wired
```

`src/auth/profile.ts` is what makes an account real: `createUserProfile` writes `v1_users/{uid}` — **document id = Firebase Auth UID** — with the username claimed on the onboarding sheet, and `syncUserProfile` re-reads it on every later sign-in to mirror `email`, `auth_providers` and the avatar back from Auth. It only writes when something actually differs, so a session restore is cheap, and it carries `created_at` over untouched because `firestore.rules` refuses an update that changes it.

**Why the profile document is created there and not at sign-in.** The username comes from the user alone — no provider pre-fill (`docs/prd.md` §4.1) — and `firestore.rules` rejects a profile whose handle is not reserved, so there is nothing to write until the onboarding sheet has been through. "No username" *is* the onboarding signal: `AuthContext` exposes it as `needsOnboarding` and `OnboardingSheet` opens on it, for a missing document and for a profile written before handles existed alike — the latter is completed in place, carrying its `created_at` and its streak over. A failed *read* deliberately does not raise that flag — an account that already has a handle must never be sent back through onboarding by a network blip.

The sheet is a blocking `Modal` rendered beside the navigator (`src/App.tsx`), not a stack screen: it is driven by session state rather than by navigation — nothing pushes or pops it, it is up exactly while `needsOnboarding` holds.

**Why the app has two sheet mechanisms.** `DailyQuestion` is a `presentation: 'formSheet'` route: the system draws it, sizes it to its content and lets the user flick it away, which is what a question you may leave unanswered needs. Onboarding needs the opposite — no grabber, no backdrop, no back button — and a form sheet is dismissable by design. Hence the `BottomSheet` primitive in `src/components/`: a `Modal` painting the same neobrutalist surface (scrim, rounded top corners, thick top border, `shadows.up`), for the sheets that have to be answered. Answering has landed and so has the result it flips to, but the question sheet is still the dismissable one: §5.4 pins it open on today's unanswered question, which is now the only piece missing from that section. Until it lands the two sheets do not share an implementation.

`src/lib/firestore.ts` mirrors `apps/functions/src/libs/firebase-admin.ts` on the client side: every ref is built with a `@statowrel/models` converter, so no screen ever reads `snap.data()` untyped. It carries `getSubDocumentRef` and `getSubCollectionRef` too — flat path segments rather than a parent ref, since a parent built by `getDocumentRef` already holds its own converter.

`src/daily-question/` is one day's question. The route is `DailyQuestion`, a `formSheet` posed over Stats with an optional `date` param — no param means today, and today is the Europe/Paris day key, never the device's. It leads with the way out on its own line, the question under it as the sheet's own title, then the options, each behind its `A` / `B` / `C` quizz letter. It wears the colour of the calendar cell that opens it: `accent` red while today is unanswered, `primary` yellow once it is answered — which also means the surface flips the moment the answer lands. Its texts take that surface's own foreground, since the palette has no muted token for either. Its single detent is `fitToContents`, so the sheet is as tall as the question it carries; that is also why the screen renders a plain column and no scroll view, since a nested scroller gives `fitToContents` nothing to measure. `useDailyQuestion` reads three documents, none of them a per-day one — there isn't any: the month index `v1_daily_question_months/{YYYY-MM}` says which question ran the day, that `v1_questions` document is the day, and the current user's answer sits under it — whose id *is* their UID, so "already answered" is one `get()` rather than a query. The month is read once (a day's entry never changes) while the question is subscribed to, since `answer_counts` moves on it; the four dead ends (`loading` / `unpublished` / `missing` / `error`) are rendered as states of the screen rather than swallowed. A past day still open to an answer carries one extra line under its options, saying the catch-up builds the collection without moving the streak — the answer trigger skips `nextStreakState` on a `late` answer, and the sheet says so before the tap rather than leaving the counter to explain itself.

**An answered day is not a question, it is the result** (`docs/prd.md` §5.5). The sheet's content forks on the answer — options while the day is open, the result once it is answered, which covers the flip after the second tap and the read-only reopening from the calendar with the same branch, since both are « there is an answer ». Three blocks, in that order: `components/StatOwrelHeadline.tsx` says the phrase and the StatOwrel straight on the sheet's own colour (hence `helpers/surface.ts`, where the two surfaces and their foregrounds live, shared by the screen and by what it lays on them); `components/AnswerRecap.tsx` is the only framed surface left — the question, then one `AnswerShareRow` per option, its share as the width of the fill behind its label and the picked one in `primary` behind a tick; `components/FriendAnswers.tsx` closes it with §4.5. The card frame that used to hold all of it is gone: boxed, the phrase competed with the recap under it instead of carrying it, and the rarity it framed is now a mention beside the date. The question moves inside the recap, so the sheet never prints it twice, and the success animation plays over the result rather than in place of it. `helpers/statowrel.ts` is unchanged and is the whole computation: the picked option's share of the day, the full distribution in the question's fixed order, and the rarity that follows — under 25% `rare`, under 10% `ultra`. Two things it does deliberately: it **folds this user's own answer into the counts** (`Math.max(stored, 1)` on the picked option), because the app writes the answer and the answer trigger increments `answer_counts` a beat later — without it the result reads « 0% » about the answer one has just given, and once the trigger lands the `max` is a no-op and the two agree; and it sums over the **question's own options** rather than over every key of `answer_counts`, so a key left behind by a rewritten question cannot inflate a denominator. Nothing is stored: rarity is that map's shape at display time, so it keeps moving while the day's answers come in and settles at close — which is why the day is subscribed to rather than read.

**A friend's answer is a read, never a query** (`docs/prd.md` §4.5). `data/useFriendAnswers.ts` reads neither the friend list nor the pictures: `src/friends/data/useFriends.ts` already subscribes to `v1_users/{uid}/v1_user_friends` for the Menu screen's list, and `useFriendAvatars` already reads one profile per UID and caches it for the session. It adds the one thing neither carries — one `get` per accepted friend on `v1_questions/{question_id}/v1_daily_question_answers/{friend_id}`. The document id being the answering user's UID is what makes that a read; a collection-group query would be the natural shape and is deliberately impossible, since `firestore.rules` only ever lets one group-query one's **own** answers. So a friend's answer stays scoped to one question — one question is one day — and nobody gets a friend's history. Those reads are one-shot: a friend answering while the sheet is open is worth one stale line rather than a listener per friend, the result being reopenable at will. Nothing is read at all until the current user's own answer exists — that flag is the BeReal mechanic of §4.5, not an optimisation. The rows are `src/friends/components/FriendRow.tsx`, the same line the Menu screen's list is built from, in a card cut by separators the same way — a friend is recognised by the same avatar wherever they show up — with the picked option as the row's action slot and the hour as its note. The list scrolls inside a bounded height, because the sheet's single detent is `fitToContents` and an unbounded one would measure taller than the screen. With no accepted friend at all the section collapses to one line on the sheet: a card holding a single grey sentence reads as a section that failed to load.

Forms use `react-hook-form` + `zod` (`@hookform/resolvers`), never raw `useState`. Firebase error codes are translated to French in `src/auth/errors.ts` — a user-facing string never leaks a raw `auth/*` code.

Both emulators are wired behind env vars (`EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_*`, `…_FIRESTORE_EMULATOR_*`), matching the ports in `firebase.json`.

Deliberately deferred: Facebook (PRD §4.1, no button yet), identity linking via `linkWithCredential` (the `auth/account-exists-with-different-credential` case shows an explanatory message instead), the avatar half of the onboarding sheet (only the handle is asked for), changing a handle once it is taken (freeing its reservation needs the backend), and account deletion.

### Design system

**Neobrutalism** visual style (reference: [neoflux](https://neobrutalism.com/preview/templates/neoflux)) — flat saturated colors, thick black borders, hard offset shadows, no gradients or blur. Every token lives in `apps/app/src/design/tokens.ts`, and every consumer reads it from there — the components' own `StyleSheet.create` blocks as much as the parts React Navigation paints itself (container theme, stack `contentStyle`). One source, no drift. It exports the color palette (`background`/`foreground`/`card`/`primary`/`primary-hover`/`secondary`/`secondary-hover`/`muted`/`accent`/`accent-hover`/`destructive`/`border`/`input`/`ring`, plus `rare`/`ultra`) — four tokens carry the identity, black text on a cream `background`, a yellow `primary` for the main action and a saturated red `accent` for the accentuated one, which is why `accent` is the only surface taking white text; the gold `rare` and the violet `ultra` sit outside that identity on purpose, as the two rarity mentions of the StatOwrel result (`docs/prd.md` §5.5) and never as a surface a screen is built on — the `radius` scale (corners are rounded rather than square: the border and the shadow carry the brutalism, so the ladder runs 8/12/16/20/24/32px from `sm` to `2xl`, `full` still available), the hard-offset no-blur `shadows` scale (`xs`/`sm`/`DEFAULT`/`md`/`lg`/`xl`/`2xl`), the thick `borderWidth` (2px), the `fonts` (`head` = Archivo Black, `sans` = Space Grotesk), the `fontSize` scale, and `spacing(steps)` — one step is 4px, which is what keeps every screen's padding and `gap` on a single grid.

Components apply the shadows through `apps/app/src/design/shadows.ts`, which hands React Native the CSS `boxShadow` string (RN 0.76+) rather than the *legacy* iOS shadow props (`shadowOffset` / `shadowRadius` / `shadowOpacity`, plus `elevation` on Android). Those stop reproducing a CSS box-shadow faithfully once a surface has a corner radius — the edge softens, which defeats the point of a neobrutalist shadow — whereas `boxShadow` keeps a `0` blur radius at `0` on any radius. Fonts load via `expo-font` + `@expo-google-fonts/archivo-black` + `@expo-google-fonts/space-grotesk` in `apps/app/src/App.tsx`, with the splash screen held until `useFonts` resolves and then until the session does. That splash is the native one alone — no JS launch screen — configured in `app.config.ts` from `apps/app/assets/splash-icon.png`, and the app icon beside it (`icon.png`, plus `adaptive-icon.png` for Android's foreground layer) is the same star.

neobrutalism.com's own registry ships components through the `shadcn` CLI (`npx shadcn add https://neobrutalism.com/r/...`), but those are web-only, built on Radix UI / Base UI — both need a DOM and can't run in React Native. Hence the hand-written token setup here rather than a CLI install.

Styling itself is plain React Native: a `StyleSheet.create` block colocated with each component, composed from those tokens. The app ran on Nativewind (Tailwind classNames for RN) until the tokens outgrew what a Tailwind theme could express — the `boxShadow` workaround above was the first crack, the pressed-button render crash (a conditionally-declared CSS variable tripping Nativewind's prop serialiser) the second — and paying a Babel transform, a Metro wrapper and a `tailwind.config.js` for a handful of hand-built primitives stopped earning its keep.

Still deferred: shared component primitives (buttons, cards, inputs) built against these tokens, and dark-mode theming (no dark-mode toggle mechanism exists yet).

## Firestore rules & indexes

`packages/firestore-config/firestore.rules` establishes the pattern: a wildcard `isAdmin()` bypass at the top (via a custom `admin` auth claim) followed by explicit per-collection rules for the mobile app's own access — collections are never left world-readable/writable by omission. Rules are OR'ed, so a per-collection rule only ever *adds* to what the `isAdmin()` bypass already grants — `allow update, delete: if false` under it means "moderators only", not "nobody". `v1_questions` shows the shape: an author may create their own proposal (`status` forced to `pending`, 2–6 options) and read it back — plus, since the app needs the day's question, any signed-in user may read a question whose `broadcast_at` has passed. That gate is the broadcast instant and not `status == 'used'`: the two coincide today, since a question is drawn and published in the same 07:00 run, but `used` only says a question left the pot — `broadcast_at` is the fact the rule is about. `v1_users` shows the other half of the pattern: a rule that keeps a field *still*, not just a document safe — the counters the answer trigger owns (`streak_count`, `streak_best`, `answers_count`, `streak_last_answered_on`) must come back unchanged from any client update, read through `data.get(field, default)` so a profile written before they existed stays editable. `firestore.indexes.json` holds the repo's first composite index — collection group `v1_daily_question_answers`, `user_id ASC, date ASC`, `queryScope: COLLECTION_GROUP` — backing a query over one user's own answers across days; add further ones as Firestore's emulator/console error messages require them (copy the definition from the error, don't hand-write it). The Stats calendar no longer runs that query — it reads the two monthly documents — but it is the one a rebuild of the projection replays, which is why the index and its recursive-wildcard rule stay.

A collection-group query is never covered by a nested `match`: it needs its own recursive-wildcard block (`match /{path=**}/v1_daily_question_answers/{user_id}`), and that block scopes reads to `resource.data.user_id` rather than the document id, because Firestore only accepts a query it can prove safe and that is the field such a query filters on. That block is also why the sub-collection's name has to be globally unique — it reaches every collection bearing it, wherever it sits. Worth remembering too: an answer's `date` and `late` are checked against the parent day document via a `get()` in the per-day rule, so neither can be forged.

## Environments

Two Firebase projects, aliased in `.firebaserc`:

- `default` → `statowrel-dev`
- `production` → `statowrel-prod`

`npm run deploy:*` scripts switch project via `firebase use` before deploying and switch back to `default` afterward for the `:production` variants, mirroring planexplora-hub's convention.

One toll each project pays once: the first **Firestore trigger** deployed to it is an Eventarc trigger, and creating it is also what creates the project's Eventarc service agent — the deploy races that agent's own IAM grant and fails with `Permission denied while using the Eventarc Service Agent`. Retrying a few minutes later goes through. `apps/functions/CLAUDE.md` carries the details and the manual grant, for the day retrying is not enough.

The deploy scripts run the Firebase CLI directly (`npm run deploy --workspace=…`) rather than through turbo. A deploy asks questions — enabling an API, setting an Artifact Registry cleanup policy — and turbo does not forward stdin to the tasks it runs, so those prompts hang unanswered. Turbo has an `interactive` task flag, but it only works under the full-screen `tui` renderer, which is not worth imposing on every `dev` and `build` run for this. It buys nothing here either: the deploy tasks are uncached and dependency-free.

## What's deliberately not here yet

- The StatOwrel result of docs/prd.md §5.5 renders what the data carries, and the data carries no picture: there is no **illustration** encart, because an option is a `{ id, label, stat_label }` and nothing else, and no **edition number** (« #142 »), because nothing counts the days since launch. The **share button** of §4.4 and its generated image are not built either. The friends of §4.5 are there now, beside the answer as much as on the Menu screen. An ultra-rare result takes a violet mention where §5.5 asks for a holographic ground animated on device tilt.
- The question sheet stays dismissable — grabber included — where §5.4 pins it open on today's unanswered question. That is now the only piece missing from that section, and it is a navigator concern (`gestureEnabled`, the Android back button) rather than a screen one. A question long enough to overflow the tallest sheet would still need a detent array plus `sheetExpandsWhenScrolledToEdge`, not a nested scroll view — and the sheet now grows again when it flips to the result, which `fitToContents` re-measures.
- The calendar is **read, not subscribed to**. `apps/app/src/stats/data/calendarCache.ts` holds the months this app run has read, at module level and keyed by user and month, and `useStatsData` reads it through `useSyncExternalStore` — so a month is fetched once and kept, and the whole refresh policy is three rules: answering marks the month it belongs to as behind, coming back to the Stats screen re-reads it, and pulling the screen down re-reads it on demand. Nothing writes into a calendar month on its own behalf while the screen is up — the two things that move it are this user answering, and the 07:00 draw landing while the app was in the background — so each is picked up at a moment it can be, for two reads, rather than by holding two open connections per visited month through the hours nothing happens. Marked, not dropped: throwing the month away would blank the calendar behind the question sheet, and `answerStore` is what covers the beat between the app's write and the trigger's, laying this session's own answers over the month it read. The **profile** is still subscribed to — the counters above the calendar belong to the answer trigger and move on their own, which is what makes the streak land without a refresh.
- No way to rebuild a calendar month from its answers. The projection is derived data with no repair path: if the answer trigger exhausts its retries on one answer, that day is missing from the user's calendar until somebody replays it by hand. An admin endpoint replaying `v1_daily_question_answers` for one user and month is the missing piece.
- No migration for documents written before the daily question was folded into `v1_questions`. A question broadcast under the old model has no `broadcast_on` / `closes_at` / `answer_counts`, and its answers still sit under a `v1_daily_questions/{date}` that nothing reads any more. Nothing rewrites either: the fix is a one-off backfill script, or wiping the collection while the app is pre-launch.
- A friendship is now written, read and answered — invited through the callable, listed on the Menu screen, accepted or deleted from its row. Still missing from §4.1: the invitation link, the 6-character code, and the account-deletion pass that would drop the friendships an account leaves behind. The two monthly documents are extra to that list: read models the PRD does not describe, because it describes what the app shows, not what it costs to show it.
- The daily cycle's back half is half there: the answer trigger increments `answer_counts`, projects the day into the calendar and moves the streak, but no midnight closer resets the streak of whoever didn't answer (docs/prd.md §6 "Backend"). The app works around that at display time — `resolveStreakCount` shows 0 when the last on-time answer is older than yesterday — so the counter is right on screen even while the stored value is stale. The push `dailyQuestions-notifyDailyQuestion` sends is still a stub: the task fires, it just doesn't notify anyone yet.
- Design-system primitives are added as screens need them — `Button`, `TextField`, `Card`, `IconButton`, `Calendar`, `Avatar`, `DropdownMenu` so far. No dark-mode theming either (light only).
- **The backoffice is one screen wide.** `apps/admin` covers the moderation flow of `docs/prd.md` §4.7 and stops there — no view over `v1_users`, `v1_usernames`, the answers or the monthly read models, where the FireCMS SPA had one over each. Inspecting or fixing any of those means the Firebase console. Rejecting a question is missing from the screen too, since it owes its author a reason.
- No shared React-hooks package (a `@repo/firebase-react` equivalent). `apps/admin` is the first place duplication actually bites: its `lib/firebase.ts` and `lib/firestore.ts` are near-copies of the app's, and its `auth/errors.ts` is the app's message table minus Apple. Small enough to live twice for now; extracting a package is the move the next time either side changes.
- No tests — matches the rest of the org's convention; do not add test infrastructure without explicit discussion.
