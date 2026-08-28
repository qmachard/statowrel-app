# Functions (`@statowrel/functions`)

Firebase Cloud Functions v2 (gen2) + Express 5, TypeScript bundled with esbuild into `dist/` — the generated artifact `firebase.json` deploys, not this workspace (see `scripts/build.mjs`).

## Domain structure

Every domain in `src/domains/` follows this pattern — a domain holds only the folders it needs (`api/` is the shape an HTTP route would take; no domain ships one today):

```
domains/{domain-name}/
├── api/
│   ├── handlers/       # One file per HTTP route (handleXxx.ts)
│   ├── middlewares/     # Express middleware
│   └── index.ts        # Express app + onRequest export
├── callables/          # One file per onCall function (xxx.ts)
├── triggers/
│   ├── steps/          # One handler per event type (onXxx.ts)
│   └── onXxxCreated.ts # Firestore trigger → dispatches to steps
├── helpers/            # Business logic utilities
├── tasks/              # Cloud Tasks handlers
├── schedules/          # Cloud Scheduler handlers
└── index.ts            # Exports Cloud Function registrations only
```

Top-level `src/index.ts` uses namespace re-exports (`export * as questions from './domains/questions'`) — this produces function names like `questions-proposeQuestion` in Firebase.

**`api/` or `callables/`?** A caller that is not the app — a webhook, a browser, `curl` — takes an HTTP route. The app takes a **callable**: the ID token rides along and is verified by the runtime, so `request.auth` is already there and there is no token middleware to write. Validate `request.data` with a zod `.safeParse()` all the same — it is untrusted input like any body — and raise an `HttpsError` rather than throwing: its code is what the client reads. The payload and result types live in `@statowrel/models`'s `callables.ts`, alongside the constant naming the callable, so the app compiles against the same shape.

## `src/libs/firebase-admin.ts`

ALWAYS use these helpers instead of calling `getFirestore()` / `snap.data()` / `bucket().file().getSignedUrl()` directly:

- `getDocumentRef(collection, id, converter).get().then(parseData)` — returns `Identifiable<T> | null`.
- `getSubDocumentRef` / `getSubCollectionRef` / `getCollectionGroupRef` for sub-documents, sub-collections, and collection groups.
- `createWriteBatch`, `createDocumentRef`, `createSubDocumentRef`, `getDocumentUpsertRef` for writes (IDs are ULIDs).
- `runTransaction(async (transaction) => …)` when a write depends on what is already there — see below.
- `parseSnapshotData(event.data, converter)` to read a trigger's raw event snapshot through a model converter.
- `getAdminStorageSignedUrl(path, filename?)`.

Every ref helper takes a `FirestoreConverter` from `@statowrel/models` — never read/write a collection without its converter.

## Triggers are delivered at least once

A Firestore trigger can fire twice for the same write, so anything it does has to be idempotent — and "increment a counter" never is on its own. Read a marker inside a transaction and bail out before writing, rather than adding a flag nobody else needs: `triggers/steps/onAnswerCreated.ts` uses the day's own entry in the author's calendar month, which the same transaction writes. The onboarding demo is the exception that proves the rule — it is projected into no calendar, so it has no free marker, and `counted_at` on the answer document is the flag it had to grow. `refunded_at` on a question is the second one, and for a stronger reason: `questions-onQuestionUpdated` also fires again on every *later* edit of a question already sitting at `rejected`, so redelivery is not even the interesting case — and what it guards is money.

A trigger on a hot collection is worth a word too. `v1_questions` takes an `answer_counts` increment on every answer given in the app, and a Firestore trigger cannot be filtered on a field, so `questions-onQuestionUpdated` runs on that whole path: its step returns on the status before it reads anything, which is what keeps the common case at one invocation and no Firestore read.

One more thing that catches people out: `DocumentReference.update()` does **not** run the converter (only `set()` and reads do), so a timestamp written through it must be a `Timestamp`, never an ISO string.

## Local development

```bash
npm run dev            # emulators (functions, firestore, auth, storage) + esbuild --watch
npm run dev:functions   # same, run from the repo root via turbo
```

No env file to set up: the emulator publishes the project id and mock credentials itself.

Emulator state persists to `.firebase-emulator/` across runs (`--export-on-exit` / `--import`).

One optional knob, for testing rather than for running: `ANSWER_TRIGGER_DELAY_MS` in `apps/functions/.env.local` (the file Firebase loads for the emulator alone) makes `onDailyQuestionAnswerCreated` sit on an answer that long before counting it. The emulator runs the trigger in milliseconds, which is the one timing production never has — the day screen folds its own answer into the tally until the trigger has been through, and that branch is otherwise unreachable locally. See docs/architecture.md § Environments. It is read with a plain `process.env`, not a `defineString()` param — see below — and the trigger checks `FUNCTIONS_EMULATOR` too, so it can never delay a deployed function.

## Env params

There are none, deliberately. `initFirebase()` calls `initializeApp()` with no arguments and lets the runtime supply the project id and Application Default Credentials — deployed and emulated alike.

Adding a `defineString()` param is not free: the Firebase CLI resolves params **at deploy time** and stops to ask for every one it cannot find in `.env` / `.env.<projectId>`, so an unset param turns every deploy into an interactive prompt. Add one only for a value the runtime genuinely cannot provide, and ship its value in `.env.<projectId>` at the same time. `.env*` is gitignored — a param holding a credential must never be committed.

**Secrets are the exception, and there is one.** `RESEND_API_KEY` (`defineSecret`, declared in `src/domains/notifications/helpers/resendEmail.ts`) is what the moderation digest sends through. A `defineSecret()` is asked for **once**, stored in Secret Manager, and read from there by every later deploy — which is exactly what a credential needs, since the alternative is a `.env` file that must never be committed. Set it before the first deploy that includes a mail-sending function:

```bash
firebase functions:secrets:set RESEND_API_KEY
```

A secret is only readable by the functions that name it in their own `secrets: []`; a function that forgets to is handed an empty string, which `sendEmails` refuses out loud rather than silently not sending.

Two plain `process.env` reads ride alongside it, because neither is a credential and neither is worth a deploy-time prompt: `RESEND_FROM` (the sender — unset, it falls back to Resend's shared `onboarding@resend.dev`, which only delivers to the address the Resend account was opened with) and `EXPO_ACCESS_TOKEN` (see below).

**Those two go in a `.env` file in *this* directory, and that takes `configDir`.** Firebase reads `.env` / `.env.<projectId>` / `.env.<alias>` — plus `.env.local` for the emulator alone — from the functions `source` directory by default, and `source` here is the generated `apps/functions/dist`, which `npm run clean` wipes before every build. So a `.env` put there cannot survive a deploy, and one put here was read by nothing. `firebase.json` therefore sets `"configDir": "apps/functions"` on the functions entry, which is the one knob that moves the lookup off `source` — without it, `RESEND_FROM`, `EXPO_ACCESS_TOKEN` and the emulator's `ANSWER_TRIGGER_DELAY_MS` are all silently ignored. `.env.example` lists them; every other `.env*` is gitignored, and **a credential never goes in one** — that is what the secret above is for.

## Ops scripts (`scripts/`)

Plain `.mjs`, run directly with node — outside `src/`, so they are neither type-checked nor reachable from the bundle's entry point, and never reach the deploy artifact.

```bash
npm run set-admin -- <email>                  # grant the `admin` claim, default project
npm run set-admin -- <email> --production
npm run set-admin -- <email> --revoke
```

`admin` is a Firebase Auth **custom claim** — what `isAdmin()` in `packages/firestore-config/firestore.rules` tests. The Firebase CLI has no command for custom claims; they only exist through the Admin SDK. The script reads project ids from `.firebaserc`, merges the claim into the user's existing ones (`setCustomUserClaims` replaces the whole object), and revokes their refresh tokens so the change applies at next sign-in instead of up to an hour later.

Authenticates with Application Default Credentials (`gcloud auth application-default login`), or hits the emulator when `FIREBASE_AUTH_EMULATOR_HOST` is set.

```bash
npm run seed-questions                        # fill v1_questions from scripts/questions.seed.json
npm run seed-questions -- --dry-run           # ... writing nothing, listing what it would write
npm run seed-questions -- ./other.json --production --status approved --author <uid>
```

Seeds the moderation pot. Questions land as `pending`, so a batch goes through the moderation console before the daily draw — which only picks from the approved pot — can reach it; `--status approved` skips that pass. The script mints a ULID per document and per option and writes through `questionConverter`, so it cannot drift from the model: everything a drawn question owns (`broadcast_at`, `broadcast_on`, `closes_at`, `answer_counts`) stays empty, and `author_id` is blank, which the app reads as "no credit line". `--author <uid>` credits the batch to somebody, and the script resolves that uid's handle **once** for the whole run: a question carries `author_username` alongside `author_id`, so naming its author costs no read when it is drawn. It is re-runnable — a question whose label and option labels are already in the collection is skipped, never rewritten, since a rewrite would repoint the answers recorded against its option ids.

Reads Firestore rather than Auth, so the emulator variable here is `FIRESTORE_EMULATOR_HOST`. The npm script at the repo root builds `@statowrel/models` first; run it from `apps/functions` and that build is on you.

```bash
npm run seed-daily-questions                  # broadcast the 5 days before today
npm run seed-daily-questions -- --days 10 --include-today
npm run seed-daily-questions -- --answers 120 --dry-run
```

Fills the days already gone, so a fresh project does not open on an empty calendar. It replays the batch `scheduleDailyQuestion` commits every morning — draw an `approved` question, stamp `status` / `broadcast_at` (07:00 Paris) / `broadcast_on` / `closes_at` (the following Paris midnight), index the day in `v1_daily_question_months` — with two differences: nobody is notified, and the days the approved pot cannot cover are minted straight from `scripts/questions.seed.json`. Minting is keyed on the label alone where `seed-questions` keys on the label *and* its options: the catalogue poses several variants of the same wording, and a calendar week showing one twice reads as a bug. A day already indexed in its month is left alone, so the script only ever fills holes and is safe to re-run.

`--answers <n>` is the one thing it writes that is not true: a fabricated tally on the days it seeds, so the result card reads « Comme 23% des gens… » on a database nobody else has answered in. Off by default, and counters on the question only — no answer document is forged under anybody's UID, and a real answer keeps incrementing them. It never overwrites a tally a question already has.

```bash
npm run seed-demo-question                    # write/repair v1_questions/{DEMO_QUESTION_ID}
npm run seed-demo-question -- --answers 2500 --dry-run
npm run seed-demo-question -- --production
```

Writes the one question the onboarding carousel poses (`docs/prd.md` §5.6) — a fixed document id, so the app reads a single document and `firestore.rules` can open it up by status alone. It sits outside the moderation lifecycle: `demo`, never approved, never drawn. It does take answers — the rules let one through on its status — but they count in its own `answer_counts` and nowhere else: no calendar, no streak, no `answers_count`, since a demo is not a day.

So the starting tally still matters. The first visitor would otherwise land on « Comme 100% des gens… » — hence a fabricated one here, the same `fabricateAnswerCounts` the daily seeder uses, which real answers then add to. Non-destructive in both directions: a document already there keeps its wording and its options, only its status moves, and a tally it already carries is never overwritten. A question that has been broadcast is refused outright — turning a day of the calendar into the demo would leave that day pointing at something no screen can render as a day.

```bash
npm run backfill-question-authors                        # stamp author_username across v1_questions
npm run backfill-question-authors -- --dry-run           # ... listing what it would write
npm run backfill-question-authors -- --production
```

Fills `author_username` on the questions written before the field existed. The credit of `docs/prd.md`
§5.4 is carried on the question so naming its author costs no profile read; the app and the console
both fall back to reading `v1_users/{author_id}` while the copy is missing, and this pass is what ends
that fallback — until it has run in production, opening a day still bills one read per credit.

One read per *distinct* author, however many questions they wrote. Admin SDK and not a client:
`firestore.rules` denies every `update` on a question to every client, which is exactly what keeps the
copy from being forged. `update()` and not `set()`, so a whole-document write cannot revert the
`answer_counts` and broadcast stamps read a moment earlier, and `updated_at` is left alone — this is
not a moderator's edit, and stamping it would make every question look freshly edited in the console's
« dernière modification ». Re-runnable: a question already carrying a handle is skipped, and one whose
author's profile is gone is left alone rather than stamped — there is nothing to credit.

```bash
npm run backfill-statcoins                               # rebuild the counters, credit what streaks owe
npm run backfill-statcoins -- --dry-run                  # ... reporting every account, writing nothing
npm run backfill-statcoins -- --production
```

Rebuilds each account's streak counters from its answers and pays the milestone rewards of
`docs/prd.md` §4.7 that those streaks earned before the currency existed. Two jobs, one replay,
because they are the same computation: the answer trigger only ever pays on answers given since the
wallet shipped, and the counters that payout is owed against are themselves values a trigger has been
incrementing one answer at a time — which drift. A profile carrying 18 answers, a best streak of 17
and a current streak of 12 is describing 29 days it does not have.

**The answers are the record**, so they are what everything is settled against. Reading `streak_count`
would not do even for the payout alone: a profile carries the streak running now and the best one ever
reached, and neither says how many milestones the account has crossed across every streak it has run —
somebody who kept a 40-day streak last spring and stopped carries `streak_count: 0` and is owed 400§.
So each account's answers are read back and the streak is rebuilt day by day, `streakStatcoinReward`
deciding each crossing exactly as the trigger does. `answers_count`, `streak_count`, `streak_best` and
`streak_last_answered_on` come out of the same pass.

**It recovers the answers that predate `date` and `late`.** Those fields are younger than the
collection, and the histories this script exists for are exactly the old ones — an answer without them
would be dropped, taking a whole streak down in silence and reporting the account as owing nothing,
which is the one wrong answer this script can give. So a missing field is read off the parent question
instead: `broadcast_on` *is* the day, `closes_at` is what `late` was decided against. One read per
question, cached across the run. Demo answers are still dropped, being no day at all.

The collection-group query is an equality on `user_id` with **no `orderBy`** — the days are sorted in
the replay. An `orderBy('date')` would silently drop every document missing that field, which is
precisely the legacy answer being recovered, and the pairing would need a composite index this script
should not depend on. The equality needs only the field override `users-deleteAccount` already does.

Re-runnable, and that is the property to keep: the wallet is credited `owed − statcoins_earned`, never
the total, and a counter already holding its replayed value is not written — so a second pass finds
nothing, and a milestone the trigger paid in between is accounted for. `update()` rather than a
whole-document `set()`, which would carry back fields read a moment earlier. Admin SDK and not a
client: the rules deny every client write that moves a wallet or a counter.

`--dry-run` reports **every** account, not only the ones it would touch — « no answers found », « owed
nothing » and « already settled » read identically from the outside, and only the first is a problem.

```bash
npm run send-test-notification -- --email moi@exemple.fr   # every device of that account
npm run send-test-notification -- --uid <uid> --date 2026-08-19
npm run send-test-notification -- --token 'ExponentPushToken[…]' --body 'Coucou'
npm run send-test-notification -- --email moi@exemple.fr --nudge --friends 3
npm run send-test-notification -- --all --dry-run
```

Sends the day's notification by hand — the one part of the daily cycle no screen can show, since it leaves the backend and only comes back as a banner. It builds exactly what `notifyDailyQuestion` builds: the same title, the same body (the day's label, copied onto `v1_daily_question_months`), the same `DAILY_QUESTION_CHANNEL_ID` and the same `{ type: 'daily_question', date }` — so a tap routes through `apps/app/src/notifications/` the way the real one does, and a working test means a working 07:00.

`--nudge` sends the 18:00 lines instead of the 07:00 one, with the count `--friends <n>` names rather than a real one: the point is to read the line on a lock screen, and counting for real would mean answering as somebody else first. Zero friends is a message of its own (« Ne perds pas ta série… »), so `--nudge` alone is worth sending too.

It then does the one thing the backend does not: it polls `/push/getReceipts`. An Expo ticket is an acceptance, not a delivery, and the difference is exactly what a test is for — `--no-receipts` skips the wait.

**There is no emulator for Expo push.** `FIRESTORE_EMULATOR_HOST` (plus `FIREBASE_AUTH_EMULATOR_HOST` for `--email`) decides where the *tokens* are read from and nothing else: the token is real, the phone is real, the banner really lands. Hence a target is required rather than defaulted, and `--all` is refused on production without `--force`.

Two failures it names rather than leaves to be guessed: no device at all (the app was never launched signed-in on a real phone — a simulator never gets a token), and a `--date` no question ran, whose tap would open a dead end.

```bash
npm run send-moderation-digest -- --dry-run              # reads the pot, sends nothing
npm run send-moderation-digest -- --dry-run --html       # ... showing the HTML body instead
npm run send-moderation-digest -- --to moi@exemple.fr    # really sends, to that address only
npm run send-moderation-digest -- --production --force   # ... to every real moderator
```

The same thing for the weekly digest, and for the same reason: it leaves the backend and only comes back in an inbox tomorrow morning. It builds exactly what `questions-scheduleModerationDigest` builds, **off the same file**: `src/domains/questions/emails/moderationDigest.fr.html` is read from disk here and inlined into the deployed bundle by esbuild's `text` loader, so a dry run renders byte for byte what Wednesday morning sends. Only the filling is duplicated — a `.mjs` cannot import the TypeScript in `src/` — so `helpers/moderationDigest.ts` and the script have to agree on it.

The behaviour worth checking by hand is the one that produces nothing: an empty pot ends the run with « the Wednesday run would send nothing at all », because a week with no mail and a week with a broken digest look identical from an inbox. It also reports the moderators it resolved, which doubles as a check that `npm run set-admin` did what it claimed.

**A target is required rather than defaulted.** `--dry-run` or `--to <email>` say what a run is for; mailing every account holding the `admin` claim needs `--force`, the default of a script that reaches real inboxes not being "all of them". `--to` also overrides the claim walk entirely, which is how the mail gets read on one's own address before anybody else sees it.

**There is no emulator for Resend**, exactly as there is none for Expo push: `FIRESTORE_EMULATOR_HOST` (plus `FIREBASE_AUTH_EMULATOR_HOST` for the moderator list) decides where the *questions* are read from and nothing else. And a real send reads `RESEND_API_KEY` from the environment — the deployed function reads the same value out of Secret Manager, which a script cannot.

## Deploy

```bash
npm run deploy:functions              # repo root, targets the `default` Firebase project
npm run deploy:functions:production   # repo root, targets `production`
```

### First Firestore trigger in a project

A Firestore trigger is not a plain function: it is an **Eventarc** trigger, created in the
database's own location (`eur3` for our multi-region European database) and pointed at a
function running in `europe-west1`. The first one deployed to a given Firebase project
fails, once:

```
Validation failed for trigger .../locations/eur3/triggers/...:
Invalid resource state for "": Permission denied while using the Eventarc Service Agent.
```

Nothing is wrong with the code. Deploying the trigger is what makes Google Cloud create the
project's Eventarc service agent, and the deploy races the propagation of that agent's own
IAM grant. **Wait a few minutes and run the same deploy again** — the CLI says as much, and
the second run goes through.

If it still fails after two retries, the grant genuinely did not land. Check it in the IAM
console with "Include Google-provided role grants" turned on, or restore it:

```bash
PROJECT_NUMBER=$(gcloud projects describe <project-id> --format='value(projectNumber)')
gcloud projects add-iam-policy-binding <project-id> \
  --member="serviceAccount:service-${PROJECT_NUMBER}@gcp-sa-eventarc.iam.gserviceaccount.com" \
  --role="roles/eventarc.serviceAgent"
```

Only ever grant a service-agent role to the service agent it belongs to. Both projects pay
this toll separately — `statowrel-prod` will hit it on its own first trigger deploy, long
after `statowrel-dev` has forgotten about it.

## Validation

Always run before considering a change complete:

```bash
npm run typecheck
npm run lint
```
