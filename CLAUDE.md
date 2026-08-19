# StatOwrel

Turborepo monorepo with npm workspaces. Node 20, TypeScript 5.4+.

**NEVER** use yarn, pnpm, or bun. Always use **npm**.

## Structure

### Apps (`apps/`)

| Directory   | Description                        | Tech                                             |
|-------------|-------------------------------------|---------------------------------------------------|
| `app`       | Mobile app (iOS + Android)          | React Native + Expo (managed) + EAS + Nativewind  |
| `firecms`   | Admin backoffice                    | React 18 + Vite (SPA) + FireCMS v2 + MUI          |
| `functions` | Backend                             | Firebase Cloud Functions v2 + Express 5           |

### Packages (`packages/`)

| Directory          | Description                                              |
|---------------------|-----------------------------------------------------------|
| `models`            | `@statowrel/models` — TypeScript interfaces + Firestore converters for all collections |
| `firestore-config`  | `@statowrel/firestore-config` — Firestore rules, indexes, Storage rules |

### Dependencies

```
app, firecms, functions → @statowrel/models
```

There is no shared React hooks package yet (no `@repo/firebase-react` equivalent) — `app` and `firecms` each call the Firebase client SDK directly for now. Extract shared hooks into a package once real duplication shows up between the two.

## Status

Early. Workspaces, build tooling, and the app skeletons are wired up. `packages/models` ships its converter infrastructure (`commons.ts`) plus the first domain model, `v1_questions`, surfaced in `apps/firecms` as the `Questions` collection. **No screens/views exist yet** — `apps/app` still has a single placeholder route. See `docs/architecture.md` for the intended shape going forward.

## Commands

```bash
npm run dev:app          # Dev mobile app (Expo dev server)
npm run dev:functions    # Dev functions (emulators + tsc --watch)
npm run dev:firecms      # Dev admin backoffice (Vite, port 3002)

npm run build            # Build all
npm run build:models
npm run build:firecms
npm run build:functions

npm run build:dev:ios       # eas build --profile development --platform ios
npm run build:dev:android
npm run build:preview:ios
npm run build:preview:android
npm run build:prod:ios      # eas build --profile production --platform ios
npm run build:prod:android
npm run submit:prod         # eas submit, iOS then Android, --profile production

npm run typecheck        # TypeScript check all (turbo)
npm run lint              # Lint all

npm run deploy:functions             # firebase deploy --only functions (default project)
npm run deploy:functions:production
npm run deploy:firestore             # firebase deploy --only firestore:rules,indexes,storage
npm run deploy:firestore:production
npm run deploy:firecms                # build + firebase deploy --only hosting
npm run deploy:firecms:production
```

**IMPORTANT**: After modifying any file in `packages/models`, ALWAYS run `npm run typecheck` to verify no type errors were introduced across the monorepo.

**IMPORTANT**: There are no PR-gating CI checks. Run `npm run typecheck` and `npm run lint` manually before merging.

## Conventions

### Code Style

- **Imports**: Use `@/*` path alias for intra-app imports (maps to `./src/*`). Use `@statowrel/models` for the shared package.
- **Forms**: use `react-hook-form` + `zod` once forms exist. NEVER use raw `useState` for form state.
- **Functions API handlers**: validate request bodies with a `zod` schema using `.safeParse()`. NEVER use `.parse()` (throw-based) or `as` type assertions for untrusted input.

### Naming

- **Screens/components**: PascalCase.
- **Hooks**: camelCase with `use` prefix (`useSessionTimer.ts`).
- **Firestore fields**: `snake_case` (never camelCase). Collections prefixed `v1_` for active data.
- **Functions API handlers**: `handle{Action}.ts` (e.g. `handlePing.ts`).

### Firestore Data Rules

- Optional fields: ALWAYS `null`, NEVER `undefined`, NEVER omit the field.
- Timestamps: Use `UniversalTimestamp` from `@statowrel/models`, never ISO strings, in the raw/Firebase-facing type.
- New collections: ALWAYS use `v1_` prefix.

### Firestore Converters

- **Reading timestamps**: ALWAYS use `parseTimestamp` from `@statowrel/models` in `fromFirestore`. NEVER inline `xxx.toDate().toISOString()` or write a new local helper. Patterns:
  - Required field with default: `parseTimestamp(data.xxx ?? null, 'now')`
  - Required with literal default: `parseTimestamp(data.xxx ?? null, '')`
  - Nullable field: `parseTimestamp(data.xxx ?? null)` → `string | null`
  - Why: legacy docs may have ISO-string timestamps written via raw `.update()` calls that bypass `toFirestore`. `parseTimestamp` accepts both `Timestamp` and `string`, so reads don't crash.
- **Writing timestamps via raw `update()` / `set()`**: ALWAYS use `Timestamp.now()` or `Timestamp.fromDate(new Date())` from `firebase-admin/firestore` (functions) or `firebase/firestore` (app, firecms). NEVER `new Date().toISOString()`. Firestore converters' `toFirestore` is **NOT** invoked by `DocumentReference.update()` — only by `set()` and on reads. Writing ISO strings via `update()` corrupts the document.

### Firebase Admin Helpers (`apps/functions`)

ALWAYS use the helpers from `@/libs/firebase-admin`. They wire converters and switch between emulator and prod consistently.

- **Read a document**: `getDocumentRef(collection, id, converter).get().then(parseData)` — returns `Identifiable<T> | null` with the `id` field merged in.
- **Read sub-documents / sub-collections**: `getSubDocumentRef(parentRef, sub, id, converter)` / `getSubCollectionRef(parentRef, sub, converter)`.
- **Read collection groups**: `getCollectionGroupRef(name, converter)`.
- **Write batches / refs**: `createWriteBatch`, `createDocumentRef`, `createSubDocumentRef`, `getDocumentUpsertRef`.
- **Storage signed URL**: `getAdminStorageSignedUrl(path, filename?)` — pass `filename` to force `Content-Disposition: attachment; filename="..."`.

NEVER access `getFirestore()` / `snap.data()` / `bucket().file().getSignedUrl()` directly when a helper exists. NEVER duplicate these helpers locally.

### Functions Domain Structure

Every domain in `functions/src/domains/` follows this pattern (see `src/domains/health` for a minimal working example):

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

Top-level `functions/src/index.ts` uses namespace re-exports (`export * as health from './domains/health'`) — this produces function names like `health-healthApi` in Firebase.

### App (`apps/app`) — React Native / Expo

- Styling via [Nativewind](https://www.nativewind.dev) (`className`), not `StyleSheet.create`, unless a style can't be expressed in Tailwind.
- Firebase client SDK (`firebase` npm package), not `@react-native-firebase` — see `apps/app/src/lib/firebase.ts`. Same SDK the converters in `@statowrel/models` target on the client side.
- Routing via [Expo Router](https://docs.expo.dev/router/introduction/) (file-based, `apps/app/app/`).
- **Design system**: neobrutalism (reference: [neoflux](https://neobrutalism.com/preview/templates/neoflux)) — bold colors, thick borders, hard offset shadows, `radius: 0`. Theme tokens live in `apps/app/tailwind.config.js` (`font-head`/`font-sans`, `borderRadius`, `borderWidth`, `boxShadow`); fonts (Archivo Black, Space Grotesk) load via `expo-font` + `@expo-google-fonts/*`. The neobrutalism.com `shadcn` registry itself is web-only (Radix/Base UI need a DOM) — it does not apply to this React Native app; reusable component primitives are hand-built against these tokens as a later step.

## Testing

There are no tests in this codebase. Do not add test infrastructure without explicit discussion.

## Documentation

- **Architecture**: `docs/architecture.md` — stack decisions, monorepo layout, Firebase project structure, EAS build/submit pipeline.
