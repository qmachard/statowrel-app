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
├── callables/          # One file per onCall function (xxx.ts)
├── triggers/
│   ├── steps/          # One handler per event type (onXxx.ts)
│   └── onXxxCreated.ts # Firestore trigger → dispatches to steps
├── helpers/            # Business logic utilities
├── tasks/              # Cloud Tasks handlers
├── schedules/          # Cloud Scheduler handlers
└── index.ts            # Exports Cloud Function registrations only
```

Top-level `src/index.ts` uses namespace re-exports (`export * as health from './domains/health'`) — this produces function names like `health-healthApi` in Firebase.

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
