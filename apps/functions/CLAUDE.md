# Functions (`@statowrel/functions`)

Firebase Cloud Functions v2 (gen2) + Express 5, TypeScript compiled with `tsc` + `tsc-alias` to `lib/`.

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
cp apps/functions/.env.example apps/functions/.env.local   # emulator params
npm run dev            # emulators (functions, firestore, auth, storage) + tsc --watch
npm run dev:functions   # same, run from the repo root via turbo
```

Emulator state persists to `.firebase-emulator/` across runs (`--export-on-exit` / `--import`).

## Env params

`src/libs/firebase-admin.ts` declares three `defineString()` params: `CUSTOM_FIREBASE_PROJECT_ID`, `CUSTOM_FIREBASE_CLIENT_EMAIL`, `CUSTOM_FIREBASE_PRIVATE_KEY` (base64 of the service account's PEM `private_key`). The Firebase CLI resolves them from, in order: `.env`, `.env.<projectId>` (`.env.statowrel-dev`, `.env.statowrel-prod`), and `.env.local` for the emulator.

All of those are gitignored — only `.env.example` is tracked, because a filled-in copy holds a real credential.

Outside the emulator, `initFirebase()` only reaches for the explicit `cert()` — deployed functions could instead rely on the runtime's default service account and drop those params entirely.

## Ops scripts (`scripts/`)

Plain `.mjs`, run directly with node — outside `src/`, so `tsc` ignores them and they are excluded from the deploy bundle (`firebase.json` → `functions.ignore`).

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
