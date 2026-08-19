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

No domain models yet — this package currently only ships `commons.ts`. Add one file per Firestore collection as the data model is designed, e.g. `v1_user.ts`, `v1_workout.ts`, following the `customerConverter`-style pattern from planexplora-hub (`toFirestore` / `fromFirestore`, `<Name>Firebase Data` raw type, `<Name>Data` app type via `ModelData<...>`, a `<NAME>_COLLECTION` constant).

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
