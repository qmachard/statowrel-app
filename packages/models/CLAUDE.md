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

## `src/callables.ts`

The wire contracts of the callable Cloud Functions — the one module here describing no Firestore collection. It carries each callable's deployed name (`INVITE_FRIEND_CALLABLE`), its payload and its result, because this package is the only one both `apps/app` and `apps/functions` depend on: a callable's payload has a converter's problem — two sides serialising the same shape with no compiler between them unless it is written down once. Fields stay `snake_case` like everywhere else, even though nothing here is stored.

## Models (`src/`)

One file per Firestore collection, **named after the collection but singular**: `v1_questions` → `src/v1_question.ts`, `v1_users` → `src/v1_user.ts`. The collection's own (plural) name lives in the file's `<NAME>_COLLECTION` constant — never hardcode it at a call site.

A sub-collection follows the same rule and keeps the `v1_` prefix, with one extra constraint: its name must be **globally unique**, because a collection group is global to the database and keyed by the last path segment alone — a bare `answers` would collide with any other `answers` sub-collection added later, and could not be versioned on its own. `v1_questions/{question_id}/v1_daily_question_answers` → `src/v1_daily_question_answer.ts`: the name says `daily_question` rather than echoing its parent because it holds answers to the question *as the daily question*, which only a broadcast question has.

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
