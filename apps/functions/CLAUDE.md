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

## `src/libs/firebase-admin.ts`

ALWAYS use these helpers instead of calling `getFirestore()` / `snap.data()` / `bucket().file().getSignedUrl()` directly:

- `getDocumentRef(collection, id, converter).get().then(parseData)` — returns `Identifiable<T> | null`.
- `getSubDocumentRef` / `getSubCollectionRef` / `getCollectionGroupRef` for sub-documents, sub-collections, and collection groups.
- `createWriteBatch`, `createDocumentRef`, `createSubDocumentRef`, `getDocumentUpsertRef` for writes (IDs are ULIDs).
- `getAdminStorageSignedUrl(path, filename?)`.

Every ref helper takes a `FirestoreConverter` from `@statowrel/models` — never read/write a collection without its converter.

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

## Validation

Always run before considering a change complete:

```bash
npm run typecheck
npm run lint
```
