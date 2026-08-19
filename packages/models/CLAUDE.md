# Models (`@statowrel/models`)

Single source of truth for all Firestore data models. TypeScript, compiled with tsc to `dist/`.

## `src/commons.ts`

Shared infrastructure — do not duplicate it in a model file:

- `UniversalTimestamp` / `UniversalGeoPoint` / `UniversalSnapshot<T>` — union types spanning the client (`firebase/firestore`) and admin (`firebase-admin/firestore`) SDKs, so one converter works in both `apps/app` and `apps/functions`.
- `ModelData<T>` — recursively rewrites a Firestore "wire" type into its app-facing shape (`UniversalTimestamp` → `string`, `UniversalGeoPoint` → `{ latitude, longitude }`).
- `FirestoreConverter<TData, TFirestoreData>` — factory signature every model's converter follows; called with the SDK's `Timestamp`/`GeoPoint` classes so the converter stays SDK-agnostic.
- `parseTimestamp` — ALWAYS use this in `fromFirestore`, never inline `.toDate().toISOString()`. See the root `CLAUDE.md` for the rationale (legacy docs written via raw `.update()`).
- `removeMissingFields` — strips `undefined` before a write; Firestore rejects `undefined` values.
- `Identifiable<T>` — `T & { id: string }`, the shape returned by `parseData` in `libs/firebase-admin`.

## Models (`src/`)

One file per Firestore collection, **named after the collection but singular**: `v1_questions` → `src/v1_question.ts`, `v1_users` → `src/v1_user.ts`. The collection's own (plural) name lives in the file's `<NAME>_COLLECTION` constant — never hardcode it at a call site.

A sub-collection follows the same rule minus the prefix: `v1_daily_questions/{date}/answers` → `src/answer.ts`. The `v1_` prefix versions the top-level collection, and a sub-tree is versioned with its parent, so it never carries one of its own.

`v1_question.ts` is the reference implementation — copy its shape. It follows the `customerConverter`-style pattern from planexplora-hub (`toFirestore` / `fromFirestore`, `<Name>FirebaseData` raw type, `<Name>Data` app type via `ModelData<...>`, a `<NAME>_COLLECTION` constant).

`noUncheckedIndexedAccess` is on in this package: build a `Record<...>` field with `Object.entries(...).reduce(...)`, never by indexing into a possibly-missing key.

Re-export every new model file from `src/index.ts`.

## Conventions

- Optional fields: ALWAYS `null` in the wire type, NEVER `undefined`.
- Firestore fields: `snake_case`. Collections prefixed `v1_` for active data.
- Timestamps: `UniversalTimestamp` in the raw/Firebase type, `string` (via `ModelData`) in the app-facing type.

## Validation

After modifying ANY model, ALWAYS run `npm run typecheck` from the repo root. This uses Turbo to run `tsc --noEmit` across all dependent apps and packages in parallel.

```bash
npm run typecheck
```

Fix ALL type errors before considering the change complete.
