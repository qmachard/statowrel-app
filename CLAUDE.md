# StatOwrel

Turborepo monorepo with npm workspaces. Node 22, TypeScript 5.4+.

**NEVER** use yarn, pnpm, or bun. Always use **npm**.

## Structure

### Apps (`apps/`)

| Directory   | Description                        | Tech                                             |
|-------------|-------------------------------------|---------------------------------------------------|
| `app`       | Mobile app (iOS + Android)          | React Native + Expo (managed) + EAS               |
| `admin`     | Question moderation console         | React 18 + Vite (SPA) + Firebase client SDK       |
| `functions` | Backend                             | Firebase Cloud Functions v2 + Express 5           |

### Packages (`packages/`)

| Directory          | Description                                              |
|---------------------|-----------------------------------------------------------|
| `models`            | `@statowrel/models` — TypeScript interfaces + Firestore converters for all collections |
| `firestore-config`  | `@statowrel/firestore-config` — Firestore rules, indexes, Storage rules |

### Dependencies

```
app, admin, functions → @statowrel/models
```

`apps/admin` is what stands where the FireCMS SPA used to: not a backoffice over every collection, but one screen over `v1_questions`. It sits behind the same custom `admin` auth claim `isAdmin()` tests and `npm run set-admin` grants. Anything else admin-shaped still happens in the Firebase console.

There is no shared React hooks package yet (no `@repo/firebase-react` equivalent) — `app` and `admin` each call the Firebase client SDK directly. Extract shared hooks into a package once real duplication shows up between the two.

## Status

Early. Workspaces, build tooling, and the app skeletons are wired up. `packages/models` ships its converter infrastructure (`commons.ts`) plus seven domain models — `v1_questions` (the moderation pot *and* the day a drawn question ran: `broadcast_at`, `broadcast_on`, `closes_at`, `answer_counts`), its `v1_daily_question_answers` sub-collection, `v1_users` (profile, sign-in identities, streak stats), `v1_usernames` (the reservation that makes a handle unique), `v1_users/{uid}/v1_user_friends` (one half of a reciprocal friendship, keyed by the friend's UID and carrying their handle, mirrored under both users from the invitation onwards — written by the invite callable, read by the Menu screen's friend list and by the day screen, which shows what each friend answered) and the calendar's two monthly read models, `v1_daily_question_months` and `v1_users/{uid}/v1_user_calendar_months`. There is no per-day document: `v1_daily_question_months` is what maps a calendar day to the question that ran it. `apps/functions` owns two domains. `friends` is one callable, `friends-inviteFriend`: it resolves an exact handle against `v1_usernames` and writes both halves of the friendship in one batch, `pending` — a callable rather than a trigger because an unknown handle produces no write to fire on. `daily-questions` is the daily cycle: the daily scheduler runs at 07:00 Paris, draws the day's question, stamps its broadcast, indexes it in its month and queues the publication notification for immediate dispatch (whose sending is still a stub); the answer trigger increments the question's `answer_counts`, projects the day into the author's calendar month and moves their streak. No midnight closer yet. `apps/app` opens on the native splash screen `app.config.ts` configures — the star on the brand yellow, held until the persisted session resolves — and wears the same star as its icon (`assets/`). Behind it: its authentication flow (Google, Apple, email/password, then the blocking sheet that asks for a unique username — `src/auth/`) and two product screens. Stats (`src/stats/`) is the root of the app — streak, record, days answered and a month calendar, read from Firestore in two documents per month. Its banner and its calendar cells open the day's question: `src/daily-question/` is the `DailyQuestion` route (today's day by default, any past day through its `date` param) — it shows the question large above its options and **takes the answer**: the double tap of docs/prd.md §4.3 writes `v1_questions/{question_id}/v1_daily_question_answers/{uid}` — document id = the Firebase Auth UID — and the sheet then **flips to the result of §5.5**, « Comme 10% des gens, tu es un.e BORDÉLIQUE » straight on the sheet, under it the one card left — the question and every option's share, one's own in yellow behind a tick — and under that the friends of §4.5, read one document per accepted friend once one has answered oneself. The shares and the rarity are computed at display time from `answer_counts`. That result is also what an answered day reopens to from the calendar. Missing from it: the option's illustration and the share button. The header's other button opens `src/friends/`, the invitation sheet: a `formSheet` route where the friend's exact handle is typed, calling `friends-inviteFriend` and answering « Utilisateur introuvable. » under the field when nobody holds it. There is no tab bar: the menu — the account, the friends, the settings and the proposed questions later — opens from the header's second button. The **friend list** of docs/prd.md §5.3 sits on the Menu screen (`src/menu/screens/MenuScreen.tsx` + `src/friends/components/FriendsCard.tsx`): one `onSnapshot` over `v1_users/{uid}/v1_user_friends` (`useFriends`), one card cut into rows by separators, invitations first — a pending one carries its answers as buttons under the row's note (« Accepter » / « Refuser » received, « Annuler » sent), while the `ghost` dropdown menu is left to the accepted friendships and their « Retirer ce pote »; refusing, cancelling and removing are all the same delete of both halves (`data/friendships.ts`). The invitation sheet opens from an icon button beside the title. The invitations received are also carried at the top of the Stats screen (`src/friends/components/InvitationsCard.tsx`) — one titleless card each on a horizontally scrolling line, and nothing at all when there is none. Every face goes through `src/components/Avatar.tsx` — initials, a DiceBear patchwork seeded on the handle (`src/lib/avatars.ts`), then the profile's `photo_url` on top, stacked so none of them can leave a hole; a friend's picture is fetched from their profile by `useFriendAvatars`. `apps/admin` is a small Vite SPA and the repo's only remaining web surface: no sign-up, sign-in only (e-mail + password, Google) behind the `admin` claim, then the whole `v1_questions` pot in one table — status per row, approve on the right, and one modal shared by « add » and « edit » (an option's ULID is carried through an edit, never regenerated). It deploys to Firebase Hosting — `npm run deploy:admin`, `firebase.json`'s `hosting` block serving `apps/admin/dist` behind the SPA rewrite and building it in its own `predeploy`. See `docs/architecture.md` for the intended shape going forward.

## Commands

```bash
npm run dev:app          # Dev mobile app (Expo dev server)
npm run dev:admin        # Dev moderation console (Vite, port 3003)
npm run dev:functions    # Dev functions (emulators + tsc --watch)

npm run build            # Build all
npm run build:models
npm run build:admin
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

npm run deploy:admin                 # firebase deploy --only hosting, apps/admin/dist (default project)
npm run deploy:admin:production

npm run set-admin -- <email>         # grants the `admin` claim (add --production)
npm run seed-questions               # fills v1_questions from apps/functions/scripts/questions.seed.json, as `pending`
npm run seed-questions -- --dry-run  # ... writing nothing (also --production, --status, --author)
npm run seed-daily-questions         # broadcasts the 5 days before today, so the app is not empty
```

**IMPORTANT**: After modifying any file in `packages/models`, ALWAYS run `npm run typecheck` to verify no type errors were introduced across the monorepo.

**IMPORTANT**: There are no PR-gating CI checks. Run `npm run typecheck` and `npm run lint` manually before merging.

## Conventions

### Code Style

- **Imports**: Use `@/*` path alias for intra-app imports (maps to `./src/*`). Use `@statowrel/models` for the shared package.
- **Forms**: use `react-hook-form` + `zod` (`@hookform/resolvers/zod`) — see `apps/app/src/auth/schemas.ts`. NEVER use raw `useState` for form state.
- **Functions API handlers**: validate request bodies with a `zod` schema using `.safeParse()`. NEVER use `.parse()` (throw-based) or `as` type assertions for untrusted input.

### Naming

- **Screens/components**: PascalCase.
- **Hooks**: camelCase with `use` prefix (`useSessionTimer.ts`).
- **Firestore collections**: `snake_case`, prefixed `v1_` for active data, and **plural** — `v1_questions`, `v1_users`, `v1_daily_question_months`.
- **Firestore fields**: `snake_case` (never camelCase).
- **Models**: named after their collection but **singular** — `v1_questions` is modelled in `packages/models/src/v1_question.ts`, exporting `QuestionFirebaseData` / `QuestionData` / `questionConverter` / `QUESTION_COLLECTION`. A sub-collection's name must be globally unique: a collection group is keyed by the last path segment alone.
- **Functions API handlers**: `handle{Action}.ts` (e.g. `handlePing.ts`).

### Firestore Data Rules

- Optional fields: ALWAYS `null`, NEVER `undefined`, NEVER omit the field.
- Timestamps: Use `UniversalTimestamp` from `@statowrel/models`, never ISO strings, in the raw/Firebase-facing type.
- New collections: ALWAYS use `v1_` prefix, ALWAYS plural.

### Auth (`apps/app`)

- Session and profile go through `src/auth/AuthContext.tsx` (`useAuth()`) — never call `onAuthStateChanged` from a screen.
- A signed-in account ALWAYS has its `v1_users/{uid}` document upserted by `src/auth/profile.ts`. **The document id is the Firebase Auth UID** — never a ULID, never a generated id. The document only exists once the username sheet has been through: `createUserProfile` reserves `v1_usernames/{handle}` first, then writes the profile — never in one batch, since the rules check the profile's username with a `get()` that a batch's own writes stay invisible to.
- Firebase error codes are translated in `src/auth/errors.ts`. NEVER surface a raw `auth/*` code to the user.
- Firestore refs in the app go through `src/lib/firestore.ts` (`getDocumentRef` / `getCollectionRef`), which wires the `@statowrel/models` converter — the client-side twin of `apps/functions/src/libs/firebase-admin.ts`.

### Firestore Converters

- **Reading timestamps**: ALWAYS use `parseTimestamp` from `@statowrel/models` in `fromFirestore`. NEVER inline `xxx.toDate().toISOString()` or write a new local helper. Patterns:
  - Required field with default: `parseTimestamp(data.xxx ?? null, 'now')`
  - Required with literal default: `parseTimestamp(data.xxx ?? null, '')`
  - Nullable field: `parseTimestamp(data.xxx ?? null)` → `string | null`
  - Why: legacy docs may have ISO-string timestamps written via raw `.update()` calls that bypass `toFirestore`. `parseTimestamp` accepts both `Timestamp` and `string`, so reads don't crash.
- **Writing timestamps via raw `update()` / `set()`**: ALWAYS use `Timestamp.now()` or `Timestamp.fromDate(new Date())` from `firebase-admin/firestore` (functions) or `firebase/firestore` (app). NEVER `new Date().toISOString()`. Firestore converters' `toFirestore` is **NOT** invoked by `DocumentReference.update()` — only by `set()` and on reads. Writing ISO strings via `update()` corrupts the document.

### Firebase Admin Helpers (`apps/functions`)

ALWAYS use the helpers from `@/libs/firebase-admin`. They wire converters and switch between emulator and prod consistently.

- **Read a document**: `getDocumentRef(collection, id, converter).get().then(parseData)` — returns `Identifiable<T> | null` with the `id` field merged in.
- **Read sub-documents / sub-collections**: `getSubDocumentRef(parentRef, sub, id, converter)` / `getSubCollectionRef(parentRef, sub, converter)`.
- **Read collection groups**: `getCollectionGroupRef(name, converter)`.
- **Read a trigger's event snapshot**: `parseSnapshotData(event.data, converter)` — a trigger hands over a raw snapshot, with no converter wired on it.
- **Read-then-write atomically**: `runTransaction(async (transaction) => …)`. A trigger is delivered at least once, so anything incrementing a counter reads a marker and bails out before writing.
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

- Styling via React Native's own `StyleSheet.create`, colocated at the top of the component file and built from `src/design/tokens.ts` — never a raw hex, a magic padding or a hardcoded font name.
- Firebase client SDK (`firebase` npm package), not `@react-native-firebase` — see `apps/app/src/lib/firebase.ts`. Same SDK the converters in `@statowrel/models` target on the client side.
- Navigation via [React Navigation 7](https://reactnavigation.org) — native stack + bottom tabs declared in `apps/app/src/navigation/`, entry point `apps/app/index.js` → `src/App.tsx`. Routes are typed through `RootStackParamList` / `TabParamList`, never route strings.
- **Design system**: neobrutalism (reference: [neoflux](https://neobrutalism.com/preview/templates/neoflux)) — bold colors, thick borders, hard offset shadows, and generously rounded corners (`sm` = 8px on the buttons, `DEFAULT` = 12px, up to 32px — never square). Every token — palette, radius, shadows, spacing, type scale, border width — lives in `apps/app/src/design/tokens.ts`, read by the components and the navigation theme alike. Components apply shadows through `apps/app/src/design/shadows.ts`, which hands React Native the CSS `boxShadow` string — the legacy iOS shadow props blur the edge once a surface has a corner radius, `boxShadow` stays crisp; fonts (Archivo Black, Space Grotesk) load via `expo-font` + `@expo-google-fonts/*`. The neobrutalism.com `shadcn` registry itself is web-only (Radix/Base UI need a DOM) — it does not apply to this React Native app; reusable component primitives are hand-built against these tokens (`apps/app/src/components/`) — `Avatar` is one such port, stacking its fallbacks instead of swapping them the way Radix does.

## Testing

There are no tests in this codebase. Do not add test infrastructure without explicit discussion.

## Documentation

- **Architecture**: `docs/architecture.md` — stack decisions, monorepo layout, Firebase project structure, EAS build/submit pipeline.
