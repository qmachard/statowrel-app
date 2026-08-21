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
| `status` | `'pending' \| 'approved' \| 'rejected' \| 'used' \| 'demo'` | moderation lifecycle; `used` questions are never redrawn. `demo` sits outside it: the onboarding sample (`DEMO_QUESTION_ID`), never moderated, never drawn — the draw reads the `approved` pot — and the one status readable without owning the question or having broadcast it |
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

It carries the `v1_` prefix *and* a globally unique name, which a sub-collection might look like it can skip. It cannot: a collection group is global to the database and keyed by the last path segment alone. A bare `answers` would collide with any other `answers` sub-collection the model grows later — the calendar's group query, its index and its recursive-wildcard rule would silently span both — and there would be no way to version this one on its own. The name says `daily_question` rather than echoing its parent because what it holds is an answer to the question *as the daily question*: only a broadcast question has any — bar the onboarding demo, which is answered by everybody who installs the app and was never a day. Its answers carry an empty `date` and a `late` of false, the two values `firestore.rules` pins them to, so nothing can mistake one for a day of a calendar or a streak.

| Field | Type | Notes |
|---|---|---|
| `user_id` | `string` | Firebase Auth UID of the author, same value as the document id |
| `question_id` | `string` | denormalized from the parent document's id |
| `date` | `string` (`YYYY-MM-DD`) | copied from the parent question's `broadcast_on` |
| `option_id` | `string` | the picked option's id, never its position in the array |
| `answered_at` | `UniversalTimestamp` | |
| `late` | `boolean` | true for a catch-up answer, given after the day closed |
| `counted_at` | `UniversalTimestamp \| null` | when the trigger folded this answer into `answer_counts`. Backend-only, `null` on create — the onboarding demo's idempotency marker, see below |

The document id is the author's Auth UID, which makes "one answer per person per day" a property of the path rather than a check — one question is one day: a second answer is a write to an existing document, so it's an `update`, and `firestore.rules` denies those — `answer_counts` can never be double-counted. `question_id` and `date` are denormalized so an answer read on its own carries what it answers and when: the trigger projects it into the two monthly documents below without a second read, and a group query over one user's answers (a rebuild, an export) can filter on the day. A question is broadcast once and never rebroadcast, so the copy never goes stale.

**The demo's answer counts, and counts in one place.** It is written like any other and increments the question's `answer_counts`, so the shares the next visitor is shown are real and keep moving. It is projected nowhere else: no calendar entry, no `answers_count`, no streak. Checking the cell of whatever day somebody signed up on would hide that day's real question behind a sample they never answered, and moving the streak would hand out a first day for free. That is also why `counted_at` exists — a trigger is delivered at least once, and the broadcast path's marker is its calendar entry, which a demo answer never writes.

**Why answers live under the question and not under the user.** `answer_counts` needs a parent document to increment on a fixed path — there's no such path if the answer lives under `v1_users`. The day screen also needs every friend's answer to one question in one query, which is only cheap when they share a parent. And the privacy boundary lands per day: reading a friend's answer never exposes their whole history, because a read is scoped to one `v1_questions/{question_id}/v1_daily_question_answers` collection at a time, and a question ran a single day.

### `v1_daily_question_months` and `v1_user_calendar_months`

`packages/models/src/v1_daily_question_month.ts` and `src/v1_user_calendar_month.ts` — the read model behind the Stats calendar (`docs/prd.md` §5.2). One document per calendar month each, keyed `YYYY-MM`, both holding a `days` map keyed by day of the month (`'01'`…`'31'`) so a merge on `days.{DD}` never rewrites the rest of the month. `monthKeyOf()` / `monthDayKeyOf()` turn a `YYYY-MM-DD` day key into that pair of coordinates.

| Collection | Scope | Written by | Holds, per day |
|---|---|---|---|
| `v1_daily_question_months/{YYYY-MM}` | shared, one per month for everybody | the daily scheduler, in the same batch that stamps the question | `question_id` and `label` — the question broadcast that day |
| `v1_users/{uid}/v1_user_calendar_months/{YYYY-MM}` | private to one user | the answer trigger, in the transaction that bumps their counters | `option_id`, `stat_label`, `late`, and `friend_answer_counts.{DD}` — how many friends answered that day |

The shared half is also the daily cycle's index: since a drawn question *is* the day, `days.{DD}.question_id` is the only thing that maps a calendar day to it, and reading today's question starts here. The Stats screen's daily-question banner (docs/prd.md §5.2) rides on the same two documents: the `label` copied onto the month index is what it announces, and "already answered" is a day of the user's own month. A banner that would otherwise be two reads on every app opening — the day, then its question — comes free with the calendar.

The shared half also carries the calendar's **lower bound**: one ordered `limit(1)` query on `v1_daily_question_months` gives the first month a question was ever broadcast in, and that is how far back the chevrons go. Deliberately not the registration month — a day older than the account is a missed day like any other, answerable in catch-up (docs/prd.md §4.2), so the archive is bounded by the questions and is the same for everybody. One read per session, since the first month never moves.

The private half also carries the calendar's **badge** (docs/prd.md §5.2): `friend_answer_counts.{DD}` counts the accepted friends who answered that day, incremented by the answer trigger under *every* friend of whoever answered, in the same transaction. It is on the read model rather than counted at display time for the same reason the rest of it is: a friend's answers are only ever readable one question at a time (`firestore.rules` — their own calendar month is private to them), so counting them client-side would be one read per friend per day of the month. It only ever goes up; whether a day is badged is that number against what the device has already shown, which is local to the phone (`apps/app/src/stats/data/seenFriendAnswers.ts`) since « déjà vu » belongs to a screen someone looked at and not to the account.

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

### `v1_user_devices`

`packages/models/src/v1_user_device.ts` — sub-collection of `v1_users`, path `v1_users/{user_id}/v1_user_devices/{push_token}`: where a notification is delivered (`docs/prd.md` §4.2).

| Field | Type | Notes |
|---|---|---|
| `user_id` | `string` | Auth UID of the device's owner, denormalized from the parent id |
| `push_token` | `string` | Expo push token, same value as the document id |
| `platform` | `'ios' \| 'android'` | What the push has to be formatted for |
| `created_at` / `updated_at` | `Timestamp` | `updated_at` is refreshed at every registration |

**The document id is the token**, the same trick `v1_usernames` uses: re-registering an install is a write to the same document rather than a duplicate nobody queries for. The token belongs to an *install* and not to an account, so signing out deletes the document — otherwise the previous account would keep pushing to a phone somebody else now holds — and the daily fan-out deletes the ones Expo rejects as `DeviceNotRegistered`, which is the system's only self-healing.

**Why Expo tokens and not FCM ones.** The app is managed Expo with no native Firebase — `app.config.ts` declares no `googleServicesFile` — so `expo-notifications` has no FCM/APNs registration to hand out and `firebase-admin`'s own messaging would have nothing to send to. Expo holds the store credentials EAS already manages and fans out to both platforms behind one endpoint.

The file also carries the two constants both sides have to spell identically, because this package is the only place they share: `EXPO_PUSH_TOKEN_PATTERN`, and `DAILY_QUESTION_CHANNEL_ID` — Android drops a notification naming a channel the device never declared.

Notification preferences (`docs/prd.md` §5.3, "Réglages") are not modelled: there is no settings screen to set them from. When they arrive they belong to the account, not to the device — one choice, however many phones.

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

The daily cycle's first half — docs/prd.md §6, "Backend". Two schedules, each queuing its own task:

| Function | Kind | Role |
|---|---|---|
| `dailyQuestions-scheduleDailyQuestion` | Cloud Scheduler, `0 7 * * *` Europe/Paris | Draws **today's** question and queues its publication |
| `dailyQuestions-notifyDailyQuestion` | Cloud Tasks (`onTaskDispatched`) | Pushes it to every registered device, through the `notifications` domain |
| `dailyQuestions-scheduleFriendsAnswersReminder` | Cloud Scheduler, `0 18 * * *` Europe/Paris | Resolves the day's question and queues the evening nudge |
| `dailyQuestions-notifyFriendsAnswers` | Cloud Tasks (`onTaskDispatched`) | Pushes, to everyone who has not answered, how many of their friends have |

The scheduler draws one `approved` question at random, flips it to `used` and stamps its broadcast — `broadcast_at` at 07:00 Paris, `broadcast_on` today's day key, `closes_at` at the following Paris midnight — then indexes it in `v1_daily_question_months`, both in **one batch**: a question is never consumed without the month entry that points a day at it, and never broadcast without the `broadcast_on` the rules check an answer against. Then it queues the notification task for immediate dispatch.

Drawing and publishing happen in the same run: everyone gets the same question at the same hour, and the day stays open until midnight, which is the whole answering window (docs/prd.md §4.2). `broadcast_at` is derived from the day key rather than read off the clock, so a retry recomputes the same instant and a run delayed by a few seconds still stamps the round hour. The push still goes through Cloud Tasks instead of being sent inline: the fan-out gets its own retries and rate limit, and a failing push never makes the scheduler re-draw the day.

**Every step is idempotent**, because Cloud Scheduler retries. The month entry is read before a draw and is written in the same batch as it, so a retry reuses the committed draw rather than burning a second question; the notification task carries a day-derived id, so a re-enqueue is rejected by Cloud Tasks as a duplicate instead of notifying twice.

`@statowrel/models`'s `daily_question_time.ts` converts a Paris wall-clock time to an instant in two passes — the offset can only be read *from* an instant, and a single pass lands on the wrong side of a DST switch. That is what keeps 07:00 and the midnight close on the right side of a DST day, which is 23 or 25 hours long. It sits in the shared package rather than in this domain because the drop hour and the midnight close are what `broadcast_at` and `closes_at` *mean*, and the seeding script below stamps them from outside the functions runtime.

`apps/functions/scripts/seed-daily-questions.mjs` (`npm run seed-daily-questions`) is that outside caller: it replays this same batch for the days already gone — by default the five before today — so a fresh project or a reset emulator does not open on an empty calendar. It draws from the approved pot first and mints what the pot cannot cover from `scripts/questions.seed.json` — the same catalogue `seed-questions.mjs` fills the moderation pot with, skipping what is already in it — leaves alone a day already indexed in its month (so it only ever fills holes) and notifies nobody. `--answers <n>` additionally fabricates a tally on the days it seeds, off by default, and counters on the question only: no answer document is forged under anybody's UID.

Deploying this domain needs the scheduler's service account to hold `cloudtasks.enqueuer` and to be allowed to `actAs` the task function's service account — the notification is enqueued from code, not by an IAM-free trigger.

The task reads the question it was handed the id of, for the notification's body: the title is the PRD's own line — « La question du jour est tombée » — and the body is the question itself, because reading it is what makes somebody open the app. One document read a day against a payload that could have skipped it; a question that cannot be read still gets a notification, on a generic body, since the drop matters more than the teaser.

**The 18:00 nudge** (`docs/prd.md` §4.5) is the same shape eleven hours later, and both schedules resolve their day through the one `helpers/monthIndex.ts`: the month entry is the only thing mapping a day to its question. It carries no state of its own — the scheduler passes the day and the question id, and *who* is notified is computed inside the task, so a retry recounts against the answers as they stand rather than replaying a list frozen at 18:00 sharp.

That count is walked from the **answerers**, not from the users (`helpers/friendsAnswers.ts`): a friendship is mirrored under both sides, so reading the accepted friends of everybody who answered yields, in one pass, every user with a count to receive and the count itself. Going the other way would mean one query per account in the database to discover that most of them have nothing to be told. Reads therefore scale with the number of answerers, twenty at a time.

Everybody who has not answered is nudged, friends or no friends — the day closes at midnight either way — and the body says which: « 4 de tes potes ont répondu à la question du jour. Et toi ? », or « Ne perds pas ta série : tu as jusqu'à minuit pour répondre. » when the count is zero, since « 0 de tes potes » reads as a bug. Whoever has answered is skipped: the line ends on a question only they would have no reason to be asked. Nothing is read off the question here — the label already dropped at 07:00, and repeating it in the evening would spoil it to somebody being asked to open the app precisely to discover it. The payload is the 07:00 one, `{ type: 'daily_question', date }`, so the tap lands on the same day through the same parser and the app needed no change to receive it.

### `notifications`

How anything in this backend reaches a phone (`docs/prd.md` §4.2). The domain registers **no Cloud Function of its own**, which is why it is absent from `src/index.ts`: nothing pushes on its own schedule yet, and each caller owns its trigger — `dailyQuestions-notifyDailyQuestion` first, `friends-onFriendCreated` next, `dailyQuestions-notifyFriendsAnswers` third. It is a service the other domains go through, not a boundary they call across a wire.

Three helpers, one responsibility each:

- `helpers/expoPush.ts` — the transport. POSTs to `exp.host/--/api/v2/push/send` in batches of 100, sequentially: Expo rate-limits on notifications per second and a once-a-day fan-out has no deadline worth racing it for. It returns **one ticket per message, in the same input order** — that alignment is the whole contract, since it is what maps a rejection back to the token that caused it. A refused request throws rather than being swallowed, so the surrounding Cloud Task retries it. An Expo ticket is an acceptance, not a delivery; the receipts that would confirm one (`/push/getReceipts`) are not polled yet, but the error that matters most — a token nobody holds any more — already comes back on the ticket.
- `helpers/deviceTokens.ts` — reads every token as a collection group with the UID it is registered under (the day's question goes to everyone, so there is nothing to filter by, and the 18:00 nudge groups on that UID rather than filtering either: a Firestore `in` takes at most thirty values, so targeting a few hundred users would be a dozen queries against this one read), reads one account's own as a sub-collection (`listUserDevices`, what a notification addressed to somebody in particular goes to — no filter, no index, only the documents it returns) and deletes the dead ones in batches of 500. Malformed tokens are dropped before sending rather than after: Expo rejects a whole request over one bad `to`, which would cost the hundred people sharing that batch their notification. The whole set is held in memory, the same bet `drawApprovedQuestion` makes on the question pot.
- `helpers/sendPush.ts` — the three ways out, plus the pruning of every `DeviceNotRegistered` any of them collects: `sendPushToAllDevices` for one line to everybody (07:00), `sendPushToUser` for the same send over one account's devices (a friend invitation), and `sendPushToUsers` for a line *per user* (18:00), which asks a callback what each device's owner is to receive and skips whoever it answers `null` for. Recipients are decided by the caller's data, never by who happens to own a phone, and an account with no registered device is nobody to push to, not a failure.

Sending is not transactional and nothing tracks who got what: a push is a hint, and the app reads the day from Firestore on launch either way. So a retry re-sends the whole fan-out rather than resuming it — safe precisely because the duplicate cost is one extra banner.

Set `EXPO_ACCESS_TOKEN` in the functions environment once "enhanced security for push notifications" is turned on for the Expo account; unset, Expo accepts the request unauthenticated.

`apps/functions/scripts/send-test-notification.mjs` (`npm run send-test-notification`) is how this is checked by hand: it reads the tokens out of Firestore and posts the very message `notifyDailyQuestion` posts — same title, same body off the month index, same channel, same `{ type, date }` payload — so a tap routes through `apps/app/src/notifications/` exactly as the 07:00 one does. `--nudge` sends the 18:00 lines instead, with the count `--friends <n>` names rather than a real one — the point is to read the line on a lock screen, and counting for real would mean answering as somebody else first. It also polls `/push/getReceipts`, which the domain itself does not, because a ticket is an acceptance and a test wants a delivery. There is no emulator for Expo push: `FIRESTORE_EMULATOR_HOST` only decides where the tokens are read from, the phone is always real — so the script requires an explicit target and refuses `--all` on production without `--force`.

`src/libs/firebase-admin.ts` centralizes all Firestore/Storage access (`getDocumentRef`, `getSubCollectionRef`, `createWriteBatch`, `getAdminStorageSignedUrl`, …) — every ref is created with a `@statowrel/models` converter, never read untyped.

### `friends`

Adding a friend by handle — docs/prd.md §4.1. Two Cloud Functions:

| Function | Kind | Role |
|---|---|---|
| `friends-inviteFriend` | Callable (`onCall`) | Resolves an exact handle and writes both halves of the friendship, `pending` |
| `friends-onFriendCreated` | Firestore trigger (`onDocumentCreated`) | Notifies the invitee that somebody just invited them |

A callable rather than a trigger, and rather than a client-side write. The screen asks a question — "does this handle exist?" — which a Firestore trigger cannot answer: it fires *after* a write, and an unknown handle produces none. `firestore.rules` would in fact let the app resolve the handle itself (`v1_usernames` is `get`-able) and write both halves (`v1_user_friends` is writable from either side of the pair), but that spreads the invariants — no self-invite, no second invitation over an existing pair — across a client nobody can hold to them.

The app reads the `v1_usernames` reservation before calling, and skips the call when there is none — one document read instead of an invocation on the likeliest outcome of that screen, a typo. The callable resolves the handle again all the same: the client-side read is a shortcut, never the check.

The pair is written in one batch, both halves `pending` from the moment the invitation is sent, so the invitee sees it in their own list without a collection-group query (see `v1_user_friend.ts`). An existing pair comes back as an outcome (`already_invited` / `already_friends`) rather than an error, since nothing failed; an unknown handle, one's own handle and a malformed one are `HttpsError`s, since none of them wrote anything.

The push is a trigger's and not the callable's, even though the callable is what writes the pair: the invitation sheet must not wait on Expo, and a refused batch must not fail an invitation that has already landed. It runs on **both** halves and notifies on the received one alone (`friendshipDirectionOf` — `incoming`), which is the whole recipient logic: nobody needs a banner for what they just did themselves. Title « Nouvelle invitation », body the inviter's handle off the half being read — one more reason `friend_username` is copied there — and a `{ type: 'friend_invite' }` payload the app routes to the Menu, where the invitation already sits with its « Accepter » / « Refuser ». At-least-once delivery makes a duplicate banner possible; the invitation is a live snapshot either way, so nothing is read twice.

The friend list of docs/prd.md §5.3 now reads those halves, on the Menu screen (`src/friends/`) — the invitation included, since both halves exist from the moment it is sent. Answering one is written by the app rather than by a callable — there is nothing to resolve, both documents already exist, and `firestore.rules` carries the whole rule: the accept is `pending` → `accepted` on both halves, never by whoever sent the invitation, and refusing, cancelling and removing are one and the same delete of both halves.

### `users`

Deleting one's own account — docs/prd.md §4.1, and what both stores require of any app one can sign up inside. One Cloud Function:

| Function | Kind | Role |
|---|---|---|
| `users-deleteAccount` | Callable (`onCall`) | Deletes the caller's answers, calendar months, push destinations, friendships, username reservation, profile and Auth user |

A callable because there is no other shape available. `firestore.rules` denies deleting a profile, a username reservation and an answer to **every** client, deliberately: freeing a handle is what makes it re-takeable by somebody else, the mirrored half of a friendship lives under the *other* user, and no rule can scope a delete to "everything this account owns" in one expression. The Admin SDK bypasses the rules, so the callable is where that scope is written down.

The order is the design: answers, calendar months, push destinations, both halves of every friendship, the reservation, the profile, and the Auth user **last**. A failure halfway leaves an account that can still sign in and retry; the reverse would leave data nobody owns and no session to come back for it. Every step is a delete, so a retry over a partial run is a no-op on what already went. The deletes are cut into batches of 400 — a write batch caps at 500 operations, and an account answering daily is past that on its answers alone in under two years.

**A sub-collection outlives the document it hangs off**, which is why `v1_user_devices` is on that list explicitly: deleting the profile leaves the push tokens standing, and the 07:00 push would keep reaching a phone whose account no longer exists. The app drops its own token on sign-out — before Firebase's, while the write is still one the rules allow — but that is no help here: `deleteAccount` signs out *after* the callable has returned, by which point the account is gone and the client-side delete would be denied (it is swallowed, so nothing surfaces). The backend owning it is what makes it true.

**The questions' `answer_counts` are not decremented.** The PRD asks for exactly that: the answers stop belonging to anybody and keep counting in the aggregate. Since an answer's document id *is* its author's UID, deleting it is what anonymising means here — there is no field left to blank, and the collection group is queried on the `user_id` field rather than the id, a group query having no way to filter on `__name__` across parents. That query carries an index cost the calendar's composite one does not cover: automatic single-field indexes are `COLLECTION`-scoped, so the equality across the group needs the `COLLECTION_GROUP` override declared in `firestore.indexes.json` — deploying this function means deploying the indexes with it. The reservation is only freed when it still points at this account: a handle that has changed hands is somebody else's, and the copy carried on the profile is not the authority on who holds it.

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

The table shows `demo` beside the four moderation statuses, so the onboarding sample is findable among a few hundred questions — its own badge, and no « Approuver » on its row: approving it would drop it into the daily draw, where it would run as a day nobody wrote it for. It is written by `npm run seed-demo-question` rather than by hand, because it also needs the fabricated tally its StatOwrel is computed from.

The document id is a ULID, and so is every option's, and **an option's id is never regenerated**: an answer and its `answer_counts` entry both point at it, so an edit carries the existing id back through the form and only mints one for an option typed in for the first time. Editing and approving both go through `updateDoc` on the fields they touch, never a whole-document `set()`, which would carry back the `answer_counts` and broadcast stamps read a moment earlier and revert whatever the backend wrote in between. Rejecting is not built yet: a rejection owes its author a reason, so it needs a text field as well as a button — `setQuestionStatus` already takes the parameter.

The create/edit modal is a native `<dialog>`: the focus trap, the inert background and Escape come from the browser rather than from a component library. It is mounted only while open and keyed by what it edits, so the form is built from the right defaults instead of being reset after mounting.

`src/lib/firebase.ts` and `src/lib/firestore.ts` are the browser twins of the app's: same converter wiring, minus the React Native persistence dance — the browser build persists in `indexedDB` on its own. `src/index.css` carries the neobrutalism tokens as CSS custom properties, ported from `apps/app/src/design/tokens.ts`, which stays the source of truth.

**It deploys to Firebase Hosting**, on the project's default site. The `hosting` block in `firebase.json` serves `apps/admin/dist` and builds it itself — its `predeploy` runs `npm run build:admin` — behind the `**` → `/index.html` rewrite an SPA needs to survive a page reload. Its cache headers follow Vite's output: `/assets/**` is content-hashed, so it ships `immutable` for a year, while `**/*.html` stays `no-cache` and revalidates, without which a deploy would sit invisible behind Hosting's hour-long default on the entry document. `npm run deploy:admin` / `:production` switch project with `firebase use` like the functions and firestore scripts. No Hosting *target* is declared: there is one site, so the default one is it — a second surface (a landing page, a preview site) is what would make a target worth its `.firebaserc` entry.

**The legal pages ride along on that site**, and they are the reason a second one is not needed yet. The CGU and the mentions légales of docs/prd.md §5.3 are two hand-written static pages in `apps/admin/public/legal/`, which Vite copies into `dist/legal/` untouched — they never go through the bundler, so they carry their own copy of the neobrutalism tokens (`legal.css`) rather than importing the console's. They survive the `**` → `/index.html` rewrite because Hosting serves a matching file *before* it applies a rewrite, and `cleanUrls` is what turns them into `/legal/cgu` and `/legal/mentions-legales` — the form the app links to (`src/components/LegalLinks.tsx`) and the one the store listings are given, so it must not change. **Two explicit rewrites carry the same two paths ahead of the catch-all**, which `cleanUrls` alone would already cover: the belt is there because the suspenders fail silently and identically to a missing page. A site deployed without either answers `/legal/cgu` with the console's own `index.html` — a 200 showing the admin SPA, not a 404 — so the failure never looks like a routing problem from the outside. The hosting config is only ever as live as the last `npm run deploy:admin`. The URL is written out in the app rather than derived from the Firebase config: the pages are the same for every build, where `EXPO_PUBLIC_FIREBASE_*` swings with the variant. The publisher's own identity — legal form, address, contact, SIREN — is what the repository cannot know, so it is marked in red in both pages and has to be filled in before they are handed to a store.

The build inlines the Firebase web config, so the deploy needs `apps/admin/.env.production.local` — Vite's precedence puts it ahead of `.env.local`, which is what keeps a dev session's values out of a deployed bundle. Without it the bundle ships empty vars and the page dies on `auth/invalid-api-key`. Emulator hosts cannot leak in either: `src/lib/firebase.ts` only wires them under `import.meta.env.DEV`, which `vite build` compiles to `false`.

## `apps/app` — mobile

Expo managed workflow, React Navigation for navigation, React Native `StyleSheet` for styling. `app.config.ts` is a dynamic config keyed off `APP_VARIANT` (`development` | `preview` | `production`), which picks the app name, the bundle identifier and the Android package. `development` carries a `.dev` suffix and installs beside either of the others; `preview` and `production` share `fr.quentinmachard.statowrel`, so those two replace each other on a device and only their names differ.

**Why preview shares production's identifier.** A Google OAuth iOS client and a Sign in with Apple capability are both bound to a bundle identifier. A `.preview` suffix would mean a third OAuth client and a third App ID to keep in step with the other two, for a variant whose whole purpose is to be what production is about to be — while sharing the identifier makes a preview build exercise the very credentials the store build will sign against. The two costs are paid deliberately: the pair cannot coexist on a device, and both profiles auto-increment, since `appVersionSource: remote` counts build numbers per application identifier and duplicates against a shared counter are what App Store Connect rejects.

### EAS build/submit pipeline

Three build profiles in `eas.json`, mapped to root-level npm scripts:

| Profile | Distribution | Script |
|---|---|---|
| `development` | internal, dev client | `build:dev:ios`, `build:dev:android` |
| `preview` | internal, production identifier | `build:preview:ios`, `build:preview:android` |
| `production` | store submission | `build:prod:ios`, `build:prod:android` |

**`@statowrel/models` is compiled on the EAS worker.** The root-level scripts prefix `npm run build:models`, but that only compiles the machine starting the build: EAS uploads the repository as git sees it — `packages/models/dist` is ignored — then installs and bundles, never running a workspace build of its own. Metro followed the package's `main` to a `dist/index.js` that did not exist and failed to resolve `@statowrel/models`. The `eas-build-post-install` hook in `apps/app/package.json` (`cd ../.. && npm run build:models`) fills that hole: EAS runs it right after the install, before bundling.

`submit:prod` runs `eas submit --profile production` for both platforms. Store credentials (Apple/Google) are configured once via `eas credentials` and stored by EAS, not in this repo.

**`APP_VARIANT` is required, never defaulted.** `app.config.ts` throws when it is missing or unknown. A default is the one misconfiguration this pipeline can have that produces no error at all: `--profile production` would build green from end to end and ship the `.dev` bundle identifier, indistinguishable from a dev build until somebody reads the identifier back off the artefact — or until the store rejects it. A build gets the value from its profile's `env` block; `dev`, `prebuild` and `submit:*` set it inline in `apps/app/package.json`; anything else run by hand has to pass it.

**Three env sources, in increasing precedence: `eas.json`'s `env`, `.env` files, then the EAS environment variables held on Expo's servers.** All three are applied on the worker *and* when the EAS CLI evaluates `app.config.ts` locally for credentials, so a build cannot resolve one bundle identifier and sign another. The environment a profile reads is derived from it — `production` for `distribution: store`, `development` for `developmentClient`, `preview` otherwise — which here matches the profile names. The public Google OAuth identifiers stay committed in `eas.json` (they are the same everywhere, and a diff should show which client a profile signs against); the `EXPO_PUBLIC_FIREBASE_*` values live in the EAS environments, which is where they will have to diverge — `.firebaserc` points both the `default` and `production` aliases at `statowrel-app` for now, so the six are identical across the three environments until the production project splits off. `src/lib/firebase.ts` throws on a missing api key / project id / app id rather than handing `initializeApp()` an `undefined` it accepts without complaint.

### Onboarding carousel

The first thing a fresh install shows, before the sign-in screen behind it — `docs/prd.md` §5.6. `apps/app/src/onboarding/` holds it: five slides saying what StatOwrel is, the last of which — « C'est parti » — is the one whose button opens the demo question as a sheet over them. That slide is dropped when there is no demo to read, since it would otherwise announce something nothing follows.

It is **laid over the app, not routed into it**. `src/App.tsx` renders it beside the navigator the way it renders the username sheet, for the same reason: there is no session yet, so there is nothing to navigate under. Whether it has been through is an `AsyncStorage` entry (`useOnboardingSeen`) kept on the **device** and not on an account — it runs before there is one — and storage that cannot be read counts as « already seen », since a carousel is not worth risking on every launch. The splash screen is held until that flag resolves as well as the session.

Three things it does that are worth knowing:

- **The demo question is real, and so is its answer — one sign-in later.** `v1_questions/{DEMO_QUESTION_ID}`, read once by its fixed id with no session at all, which is what the `demo` rule above exists for. It is posed in the same red sheet as the daily question, with the same double tap and the same result under it. The pick cannot be written on the spot — an answer's document id *is* its author's UID, and there is no account yet — so it waits in `AsyncStorage` (`demoAnswerStore`) and `useDemoAnswerFlush`, mounted beside the notification hook, writes it through the same `submitAnswer` at the first sign-in. It then counts in the question's `answer_counts` and in nothing else: not the calendar, not the streak, not `answers_count`, so a sample never stands in for a day. The pick is dropped once written, or once the answer it would create is read back as already there — never inferred from the error, a `permission-denied` on undeployed rules being the failure this meets first. The tally it starts from is `npm run seed-demo-question`'s, and a question that cannot be read simply ends the carousel a slide early.
- **The permission dialog is primed, not sprung.** The fourth slide says what the app will send, and its button is what raises the dialog — `requestPushPermission`, which asks and registers nothing, there being no account yet. `registerDeviceForPush` never asks (`ask` defaults to false): it settles for the permission it finds, so the token lands at the first signed-in launch and the dialog is never raised twice. A refusal is final on both platforms, so the cold prompt was the one thing worth moving.
- **The double tap is shared, not copied.** `src/daily-question/helpers/useDoubleTapAnswer.ts` holds the interaction of §4.3 — the selection, the 150 ms guard, the haptics — and both the real question and the demo mount it. The signature interaction of the product is not something two screens should be free to time differently.

### Authentication

Firebase Auth, three methods offered at the same level (`docs/prd.md` §4.1). The JS `firebase` SDK owns the *session* everywhere; the two social providers only exist to hand it a credential:

| Provider | How the credential is obtained |
|---|---|
| Email / password | `createUserWithEmailAndPassword` — the address is not verified, on purpose (`docs/prd.md` §4.1) |
| Google | `@react-native-google-signin/google-signin` → `idToken` → `GoogleAuthProvider.credential()` |
| Apple | `expo-apple-authentication` → `identityToken` → `new OAuthProvider('apple.com').credential()` |

**Why the native Google SDK and not `expo-auth-session`.** `signInWithPopup` has no meaning in React Native, so a credential has to come from somewhere else. `expo-auth-session` would drive the OAuth dance in a web view; the native SDK is what Expo's own Google-authentication guide recommends, gives a first-party account picker, and returns an id token directly. The cost is a config plugin (`iosUrlScheme`, the reversed iOS client id) — acceptable since CNG and `expo-dev-client` are already in place. The plugin is added only when `EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME` is set, so a checkout without Google credentials still runs; the button then hides itself. The scheme is set in all three profiles of `eas.json` — `development` from its own iOS OAuth client, `preview` and `production` from the one client their shared bundle identifier entitles them to.

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

### Notifications

The receiving half of `docs/prd.md` §4.2: `apps/app/src/notifications/` is what makes the 07:00 fan-out reach a phone at all, since the backend can only push to a token this app has stored.

`expo-notifications` is a native module, so it comes with a config plugin (`app.config.ts`) — that plugin is what adds the push entitlement on iOS and `POST_NOTIFICATIONS` on Android, and a build without it would take a token and never show a banner. Everything else is one hook, `data/usePushNotifications.ts`, mounted once from `src/App.tsx` inside both the `AuthProvider` and the `NavigationContainer` because it needs what each of them holds: the session's UID, and a navigator to open a day on.

**It hangs off the session, never off `onAuthStateChanged`.** A UID is what the token is stored under, and a signed-out stack has no `DailyQuestion` route to open. So signing in registers, and signing out unregisters — from `signOut()` itself (`src/auth/providers.ts`), before Firebase's own sign-out, while the delete is still a write the rules let the user make.

**Registration is one document, at every launch of a signed-in session** — `data/deviceRegistration.ts`: create the Android channel (`DAILY_QUESTION_CHANNEL_ID` from `@statowrel/models`, without which Android silently drops a notification naming it), ask for the permission once, mint the token with `getExpoPushTokenAsync({ projectId })` off `extra.eas.projectId`, then write `v1_users/{uid}/v1_user_devices/{push_token}` through `userDeviceConverter`. The document id is the token, so a re-registration is a write to the same document rather than a duplicate; `created_at` is read back from the existing document instead of being restamped, and `updated_at` is what a launch actually moves.

**Nothing in it can fail a launch.** Every step has an ordinary way of not happening — the native module missing from a stale dev client, `getExpoPushTokenAsync` rejecting on a simulator, a refused permission, no network — so the module is required lazily (the same trick `src/auth/nativeModules.ts` plays on the sign-in providers, and it matters more here: this one is mounted at the root of the tree, where a throw takes the whole app down rather than one button), and the registration swallows its own errors and returns `null`. A refusal is never re-prompted either: `canAskAgain` is false after the first "no", and re-asking would raise a dialog the system does not show.

**A tap opens the day, not the question.** The push carries `{ type: 'daily_question', date }` — the day key, because the app routes on a date and an id it would have to resolve first says nothing more. It is parsed with `zod` rather than cast (`helpers/pushRoute.ts`): it comes off the network and is read before any screen is, so an unknown payload has to end in "nothing happens". The tap that *launched* the app is read from `getLastNotificationResponseAsync()` beside the listener, and both are deduplicated by the notification's own identifier, since Android delivers a launching tap to both. `helpers/openDailyQuestion.ts` navigates through `navigationRef` and waits — up to five seconds, polling — for the container to report itself ready: on a cold start the tap is read on the very commit the navigator mounts on, and nothing else queues a navigation for that moment.

Both backend notifications travel on the same payload and the same channel, so this half needed nothing added to receive the 18:00 nudge. Still missing: the monochrome Android status-bar icon (Expo falls back to the app icon, which Android renders as a white blob), the notification preferences of `docs/prd.md` §5.3 — which, now that there are two messages a day, are what lets somebody keep one and drop the other — and any notification not about the day's question.

### Design system

**Neobrutalism** visual style (reference: [neoflux](https://neobrutalism.com/preview/templates/neoflux)) — flat saturated colors, thick black borders, hard offset shadows, no gradients or blur. Every token lives in `apps/app/src/design/tokens.ts`, and every consumer reads it from there — the components' own `StyleSheet.create` blocks as much as the parts React Navigation paints itself (container theme, stack `contentStyle`). One source, no drift. It exports the color palette (`background`/`foreground`/`card`/`primary`/`primary-hover`/`secondary`/`secondary-hover`/`muted`/`accent`/`accent-hover`/`destructive`/`border`/`input`/`ring`, plus `rare`/`ultra`) — four tokens carry the identity, black text on a cream `background`, a yellow `primary` for the main action and a saturated red `accent` for the accentuated one, which is why `accent` is the only surface taking white text; the gold `rare` and the violet `ultra` sit outside that identity on purpose, as the two rarity mentions of the StatOwrel result (`docs/prd.md` §5.5) and never as a surface a screen is built on — the `radius` scale (corners are rounded rather than square: the border and the shadow carry the brutalism, so the ladder runs 8/12/16/20/24/32px from `sm` to `2xl`, `full` still available), the hard-offset no-blur `shadows` scale (`xs`/`sm`/`DEFAULT`/`md`/`lg`/`xl`/`2xl`), the thick `borderWidth` (2px), the `fonts` (`head` = Archivo Black, `sans` = Space Grotesk), the `fontSize` scale, and `spacing(steps)` — one step is 4px, which is what keeps every screen's padding and `gap` on a single grid.

Components apply the shadows through `apps/app/src/design/shadows.ts`, which hands React Native the CSS `boxShadow` string (RN 0.76+) rather than the *legacy* iOS shadow props (`shadowOffset` / `shadowRadius` / `shadowOpacity`, plus `elevation` on Android). Those stop reproducing a CSS box-shadow faithfully once a surface has a corner radius — the edge softens, which defeats the point of a neobrutalist shadow — whereas `boxShadow` keeps a `0` blur radius at `0` on any radius. Fonts load via `expo-font` + `@expo-google-fonts/archivo-black` + `@expo-google-fonts/space-grotesk` in `apps/app/src/App.tsx`, with the splash screen held until `useFonts` resolves and then until the session does. That splash is the native one alone — no JS launch screen — configured in `app.config.ts` from `apps/app/assets/splash-icon.png`, and the app icon beside it (`icon.png`, plus `adaptive-icon.png` for Android's foreground layer) is the same star.

neobrutalism.com's own registry ships components through the `shadcn` CLI (`npx shadcn add https://neobrutalism.com/r/...`), but those are web-only, built on Radix UI / Base UI — both need a DOM and can't run in React Native. Hence the hand-written token setup here rather than a CLI install.

Styling itself is plain React Native: a `StyleSheet.create` block colocated with each component, composed from those tokens. The app ran on Nativewind (Tailwind classNames for RN) until the tokens outgrew what a Tailwind theme could express — the `boxShadow` workaround above was the first crack, the pressed-button render crash (a conditionally-declared CSS variable tripping Nativewind's prop serialiser) the second — and paying a Babel transform, a Metro wrapper and a `tailwind.config.js` for a handful of hand-built primitives stopped earning its keep.

Still deferred: shared component primitives (buttons, cards, inputs) built against these tokens, and dark-mode theming (no dark-mode toggle mechanism exists yet).

## Firestore rules & indexes

`packages/firestore-config/firestore.rules` establishes the pattern: a wildcard `isAdmin()` bypass at the top (via a custom `admin` auth claim) followed by explicit per-collection rules for the mobile app's own access — collections are never left world-readable/writable by omission. Rules are OR'ed, so a per-collection rule only ever *adds* to what the `isAdmin()` bypass already grants — `allow update, delete: if false` under it means "moderators only", not "nobody". `v1_questions` shows the shape: an author may create their own proposal (`status` forced to `pending`, 2–6 options) and read it back — plus, since the app needs the day's question, any signed-in user may read a question whose `broadcast_at` has passed. That gate is the broadcast instant and not `status == 'used'`: the two coincide today, since a question is drawn and published in the same 07:00 run, but `used` only says a question left the pot — `broadcast_at` is the fact the rule is about. The answer rule under it splits the same way: `hasAnswerShape()` is what every answer has to look like — including a `counted_at` left null, since that field is the trigger's own marker — and then either `isAnswerToBroadcast` (dated with the parent's `broadcast_on`, `late` decided against its `closes_at`) or `isAnswerToDemo` (status `demo`, an empty date, never late). The demo is let through by its status rather than by a hole in the broadcast check, so the moderation pot stays unanswerable. One more clause hangs off `v1_questions`, and it is the only rule in the file that grants anything **without a session**: `allow get: if resource.data.status == 'demo'`, for the sample question the onboarding carousel poses before sign-up. The anonymity stops there — `get` and deliberately never `list`, one document by its fixed id and nothing else of the database — and it does not extend to writing: the answer rule still wants an owner, which is why the carousel's pick waits on the phone until there is one. `v1_users` shows the other half of the pattern: a rule that keeps a field *still*, not just a document safe — the counters the answer trigger owns (`streak_count`, `streak_best`, `answers_count`, `streak_last_answered_on`) must come back unchanged from any client update, read through `data.get(field, default)` so a profile written before they existed stays editable. `firestore.indexes.json` holds the repo's first composite index — collection group `v1_daily_question_answers`, `user_id ASC, date ASC`, `queryScope: COLLECTION_GROUP` — backing a query over one user's own answers across days, and beside it a `fieldOverrides` entry granting `user_id` the `COLLECTION_GROUP` scope that an equality across the group needs on its own (the composite one does not stand in for it — see the `users` domain above); add further ones as Firestore's emulator/console error messages require them (copy the definition from the error, don't hand-write it). The Stats calendar no longer runs that query — it reads the two monthly documents — but it is the one a rebuild of the projection replays, which is why the index and its recursive-wildcard rule stay.

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
- The daily cycle's back half is half there: the answer trigger increments `answer_counts`, projects the day into the calendar and moves the streak, but no midnight closer resets the streak of whoever didn't answer (docs/prd.md §6 "Backend"). The app works around that at display time — `resolveStreakCount` shows 0 when the last on-time answer is older than yesterday — so the counter is right on screen even while the stored value is stale.
- **The notification system is whole now** — the app registers its token, the two schedules push to it and a tap opens the day — **and it has grown a second message**, the 18:00 nudge counting the friends who answered. What is still missing sits at both ends: the receipts poll (`/push/getReceipts`) that would catch a delivery failing after Expo accepted it, a paginated fan-out for the day the token set stops fitting in one function's memory, the notification preferences of `docs/prd.md` §5.3, and the monochrome Android status-bar icon `apps/app/assets/` does not carry — without one, Expo falls back to the app icon and Android renders it as a white blob. A token is refreshed at launch and never otherwise: Expo can rotate one on a running app, and nothing here listens for that.
- Design-system primitives are added as screens need them — `Button`, `TextField`, `Card`, `IconButton`, `Calendar`, `Avatar`, `DropdownMenu` so far. No dark-mode theming either (light only).
- **The backoffice is one screen wide.** `apps/admin` covers the moderation flow of `docs/prd.md` §4.7 and stops there — no view over `v1_users`, `v1_usernames`, the answers or the monthly read models, where the FireCMS SPA had one over each. Inspecting or fixing any of those means the Firebase console. Rejecting a question is missing from the screen too, since it owes its author a reason.
- No shared React-hooks package (a `@repo/firebase-react` equivalent). `apps/admin` is the first place duplication actually bites: its `lib/firebase.ts` and `lib/firestore.ts` are near-copies of the app's, and its `auth/errors.ts` is the app's message table minus Apple. Small enough to live twice for now; extracting a package is the move the next time either side changes.
- No tests — matches the rest of the org's convention; do not add test infrastructure without explicit discussion.
