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
npm run dev            # emulators (functions, firestore, auth, storage) + tsc --watch
npm run dev:functions   # same, run from the repo root via turbo
```

Emulator state persists to `.firebase-emulator/` across runs (`--export-on-exit` / `--import`).

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
