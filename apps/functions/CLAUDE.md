# Functions (`@statowrel/functions`)

Firebase Cloud Functions v2 (gen2) + Express 5, TypeScript bundled with esbuild into `dist/` — the generated artifact `firebase.json` deploys, not this workspace (see `scripts/build.mjs`).

## Domain structure

Every domain in `src/domains/` follows this pattern (see `src/domains/health` for a minimal working example):

```
domains/{domain-name}/
├── api/
│   ├── handlers/       # One file per HTTP route (handleXxx.ts)
│   ├── middlewares/     # Express middleware
│   └── index.ts        # Express app + onRequest export
├── triggers/
│   ├── steps/          # One handler per event type (onXxx.ts)
│   └── onXxxCreated.ts # Firestore trigger → dispatches to steps
├── helpers/            # Business logic utilities
├── tasks/              # Cloud Tasks handlers
├── schedules/          # Cloud Scheduler handlers
└── index.ts            # Exports Cloud Function registrations only
```

Top-level `src/index.ts` uses namespace re-exports (`export * as health from './domains/health'`) — this produces function names like `health-healthApi` in Firebase.

An API app is admin-only by putting the check on the app rather than on each route — `daily-questions/api/index.ts` does `app.use(requireAdmin)` before its routes. `requireAdmin` verifies a Firebase ID token and demands the `admin` custom claim, the same signal `isAdmin()` uses in `packages/firestore-config/firestore.rules`: the Admin SDK bypasses the rules entirely, so an endpoint that writes carries its own gate.

## The month index is a projection, and projections need a repair path

`v1_daily_question_months` is what the Stats banner and the calendar read — a day absent from it is a day neither can see, however complete it is in `v1_daily_questions`. It is written in the batch that draws the day, so the two can never diverge on a fresh draw. Two things can still leave a day out of it:

- a day drawn before the index existed;
- a run that died between the draw and the index.

`scheduleDailyQuestion` therefore re-checks the day it reuses (`indexDailyQuestion` in `helpers/monthIndex.ts` — one read on a day already indexed, which is every day from now on), and `POST /reindex-months` on `dailyQuestionsApi` replays a range of already-drawn days. Both are idempotent: they read the month first and write nothing for a day already there.

Anything else derived from another collection gets the same treatment — write it where the source is written, re-check it where the write can be skipped, and expose a replay for the days that predate it.

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

A Firestore trigger can fire twice for the same write, so anything it does has to be idempotent — and "increment a counter" never is on its own. Read a marker inside a transaction and bail out before writing, rather than adding a flag nobody else needs: `triggers/steps/onAnswerCreated.ts` uses the day's own entry in the author's calendar month, which the same transaction writes.

One more thing that catches people out: `DocumentReference.update()` does **not** run the converter (only `set()` and reads do), so a timestamp written through it must be a `Timestamp`, never an ISO string.

## Local development

```bash
npm run dev            # emulators (functions, firestore, auth, storage) + esbuild --watch
npm run dev:functions   # same, run from the repo root via turbo
```

No env file to set up: the emulator publishes the project id and mock credentials itself.

Emulator state persists to `.firebase-emulator/` across runs (`--export-on-exit` / `--import`).

## Env params

There are none, deliberately. `initFirebase()` calls `initializeApp()` with no arguments and lets the runtime supply the project id and Application Default Credentials — deployed and emulated alike.

Adding a `defineString()` param is not free: the Firebase CLI resolves params **at deploy time** and stops to ask for every one it cannot find in `.env` / `.env.<projectId>`, so an unset param turns every deploy into an interactive prompt. Add one only for a value the runtime genuinely cannot provide, and ship its value in `.env.<projectId>` at the same time. `.env*` is gitignored — a param holding a credential must never be committed.

## Ops scripts (`scripts/`)

Plain `.mjs`, run directly with node — outside `src/`, so they are neither type-checked nor reachable from the bundle's entry point, and never reach the deploy artifact.

```bash
npm run set-admin -- <email>                  # grant the `admin` claim, default project
npm run set-admin -- <email> --production
npm run set-admin -- <email> --revoke
```

`admin` is a Firebase Auth **custom claim** — what `isAdmin()` in `packages/firestore-config/firestore.rules` tests. The Firebase CLI has no command for custom claims; they only exist through the Admin SDK. The script reads project ids from `.firebaserc`, merges the claim into the user's existing ones (`setCustomUserClaims` replaces the whole object), and revokes their refresh tokens so the change applies at next sign-in instead of up to an hour later.

Authenticates with Application Default Credentials (`gcloud auth application-default login`), or hits the emulator when `FIREBASE_AUTH_EMULATOR_HOST` is set.

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
