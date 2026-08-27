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

There is no shared React hooks package yet (no `@repo/firebase-react` equivalent) — `app` and `admin` each call Firebase directly, and no longer through the same SDK: `app` runs on **React Native Firebase** (the native SDKs), `admin` on the web `firebase` SDK a browser is limited to. Which is a second reason not to rush a shared hooks package — a hook would have to span two SDKs.

## Status

Early. Workspaces, build tooling, and the app skeletons are wired up. `packages/models` ships its converter infrastructure (`commons.ts`) plus eight domain models — `v1_questions` (the moderation pot *and* the day a drawn question ran: `broadcast_at`, `broadcast_on`, `closes_at`, `answer_counts`, `updated_at`, `author_username` — plus the `demo` status and `DEMO_QUESTION_ID`, the onboarding sample that is never moderated and never drawn), its `v1_daily_question_answers` sub-collection, `v1_users` (profile, sign-in identities, streak stats, and the token wallet — `token_balance` plus the `tokens_earned` / `tokens_spent` trace, backend-owned like the streak), `v1_usernames` (the reservation that makes a handle unique), `v1_users/{uid}/v1_user_friends` (one half of a reciprocal friendship, keyed by the friend's UID and carrying their handle, mirrored under both users from the invitation onwards — written by the invite callable, read by the Menu screen's friend list and by the day screen, which shows what each friend answered) `v1_users/{uid}/v1_user_devices` (one Expo push token, the document id being the token itself — written by the app at every launch of a signed-in session, deleted at sign-out, read by the daily fan-out) and the calendar's two monthly read models, `v1_daily_question_months` and `v1_users/{uid}/v1_user_calendar_months`. There is no per-day document: `v1_daily_question_months` is what maps a calendar day to the question that ran it. `apps/functions` owns four domains. `users` is one callable, `users-deleteAccount`: it deletes the caller's answers, calendar months, push destinations, both halves of every friendship, username reservation, profile and Auth user, in that order — a callable because the rules deny every one of those deletes to every client, and because the questions' `answer_counts` are left standing on purpose (the answers stop belonging to anybody and keep counting in the aggregate). `friends` is a callable and a trigger: `friends-inviteFriend` resolves an exact handle against `v1_usernames` and writes both halves of the friendship in one batch, `pending` — a callable rather than a trigger because an unknown handle produces no write to fire on — and `friends-onFriendCreated` notifies the invited half, « Nouvelle invitation » over the inviter's handle, on its own Android channel and routing a tap to the Menu; it fires on both halves and pushes on the received one alone, so nobody is told what they just did themselves. `daily-questions` is the daily cycle: the daily scheduler runs at 07:00 Paris, draws the day's question, stamps its broadcast, indexes it in its month and queues the publication notification for immediate dispatch — which really sends, « La question du jour est tombée » over the question's own label, to the tokens the app now registers; a second scheduler runs at 18:00 and queues the evening nudge, which counts, per user, the accepted friends who have already answered (walked from the answerers, since a friendship is mirrored) and pushes « 4 de tes potes ont répondu à la question du jour. Et toi ? » to everyone who has not answered — « Ne perds pas ta série… » when that count is zero — while whoever has already answered gets the other line, « Découvre la réponse de tes potes à la question du jour. », and nothing at all when none of them has answered; both travel on the 07:00 payload, so a tap opens the same day; the answer trigger increments the question's `answer_counts`, projects the day into the author's calendar month, moves their streak — paying `STREAK_TOKEN_REWARD` (100) into the wallet in that same transaction every `STREAK_TOKEN_MILESTONE` (10) consecutive days, docs/prd.md §4.7, the payout the proposal form of a later slice will spend — and counts the answer onto **every accepted friend's** calendar month (`friend_answer_counts.{DD}`), which is what puts the « nouvelles réponses » badge on that day's calendar cell. No midnight closer yet. `notifications` is the way out to a phone — the Expo Push transport, the collection-group read of every token, the sub-collection read of one account's own (`sendPushToUser`, what a notification addressed to somebody in particular goes through), the line-per-user fan-out the evening nudge sends through (`sendPushToUsers`) and the purge of the dead ones — and the one domain registering no Cloud Function of its own: the other domains own the trigger, it owns the sending. `apps/app` opens on the **onboarding carousel** of docs/prd.md §5.6 the first time it is launched on a phone (`src/onboarding/`) — four slides saying what StatOwrel is, the last of them raising the notification permission itself rather than letting the cold system prompt be the first thing seen, then the **demo question** popped as the same red sheet the daily one wears: `v1_questions/01M0HNM3RQMP2TDXPTW6ZSSM17`, carrying the new `demo` status and the one thing the app lets anybody read with **no session at all** (`firestore.rules` grants that one `get`, never a `list`). The pick cannot be written there — an answer's id is its author's UID — so it waits in `AsyncStorage` and lands at the first sign-in (`useDemoAnswerFlush`), where it counts in the question's `answer_counts` alone: no calendar, no série, no « jours répondus », a demo not being a day. The starting tally is what `npm run seed-demo-question` puts on it. Whether the carousel has been seen is kept on the device, not on the account, since it precedes the account. Otherwise `apps/app` opens on the native splash screen `app.config.ts` configures — the star on the brand yellow, held until the persisted session resolves — and wears the same star as its icon (`assets/`). Behind it: its authentication flow (Google, Apple, email/password — reset link included, the « Mot de passe oublié ? » screen mailing it and Firebase's own page taking the new password — then the blocking sheet that asks for a unique username — `src/auth/`), the receiving half of the daily push (`src/notifications/` — one hook mounted from `App.tsx`, hanging off `useAuth()`: the two Android channels — the day's question and the friend invitations, apart so silencing one leaves the other alone —, the permission asked once by the onboarding carousel and offered again — once per install, as a native alert, then permanently as the Menu's own button — to whoever was already signed in when that carousel shipped, the Expo token written to `v1_user_devices` as soon as the permission turns granted and deleted from `signOut()`, and a tap that opens whatever its payload names, the day or the Menu; a simulator, a stale dev client and a refused permission all end in a warning and nothing else) and two product screens. Stats (`src/stats/`) is the root of the app — streak, record, days answered and a month calendar, read from Firestore in two documents per month, and under the calendar the locked door of docs/prd.md §4.7 (`ProposeQuestionButton`): a bare button carrying its price on its own small line — « Il te manque 40 jetons », then « 100 jetons » once the wallet covers it — and opening nothing yet, the proposal form and the callable that would debit it being the next slice. The balance itself is the strip's fourth tile. A cell carries a small pink bead, hung off its corner, when friends have answered that day since it was last opened: the month's own `friend_answer_counts` against what the device has already shown, held locally in `src/stats/data/seenFriendAnswers.ts` and levelled when the day is reopened. Its banner — the question while the day is still open, then « RDV demain » on the flat sand of a spent calendar cell, inert — and its calendar cells open the day's question: `src/daily-question/` is the `DailyQuestion` route (today's day by default, any past day through its `date` param) — it shows the question large above its options and **takes the answer**: the double tap of docs/prd.md §4.3 writes `v1_questions/{question_id}/v1_daily_question_answers/{uid}` — document id = the Firebase Auth UID — and the sheet then **flips to the result of §5.5**, « Comme 10% des gens, tu es un.e BORDÉLIQUE » straight on the sheet, under it the one card left — the question and every option's share, one's own in yellow behind a tick — and under that the friends of §4.5, read one document per accepted friend once one has answered oneself. The shares and the rarity are computed at display time from `answer_counts`. That result is also what an answered day reopens to from the calendar. Missing from it: the option's illustration and the share button. The header's other button opens `src/friends/`, the invitation sheet: a `formSheet` route where the friend's exact handle is typed, calling `friends-inviteFriend` and answering « Utilisateur introuvable. » under the field when nobody holds it. There is no tab bar: the menu — the account, the friends, the settings and the proposed questions later — opens from the header's second button. The **friend list** of docs/prd.md §5.3 sits on the Menu screen (`src/menu/screens/MenuScreen.tsx` + `src/friends/components/FriendsCard.tsx`): one `onSnapshot` over `v1_users/{uid}/v1_user_friends` (`useFriends`), one card cut into rows by separators, invitations first — a pending one carries its answers as buttons under the row's note (« Accepter » / « Refuser » received, « Annuler » sent), while the `ghost` dropdown menu is left to the accepted friendships and their « Retirer ce pote »; refusing, cancelling and removing are all the same delete of both halves (`data/friendships.ts`). The invitation sheet opens from an icon button beside the title. The bottom of that screen is the settings block of docs/prd.md §5.3: signing out, « Supprimer mon compte » in `ghost` behind a native confirmation (`src/auth/account.ts` → `users-deleteAccount`, then a local sign-out), and under them the three small links to the CGU, the politique de confidentialité and the mentions légales (`src/components/LegalLinks.tsx`, also pinned at the bottom of the sign-in and sign-up screens — the conditions have to be readable before an account exists). The invitations received are also carried at the top of the Stats screen (`src/friends/components/InvitationsCard.tsx`) — one titleless card each on a horizontally scrolling line, and nothing at all when there is none. Every face goes through `src/components/Avatar.tsx` — initials, a DiceBear patchwork seeded on the handle (`src/lib/avatars.ts`), then a real picture on top when there is one — today only the Menu screen's own avatar, reading the provider photo straight off Firebase Auth (`user.photoURL`): `v1_users` carries no `photo_url` any more — stacked so none of them can leave a hole; a friend's face is the generated one, seeded on the `friend_username` their friendship entry already carries — no profile read per friend (the day a real profile-photo system ships, `photo_url` gets denormalized onto `v1_user_friends` by the backend instead). `apps/admin` is a small Vite SPA and the repo's only remaining web surface: no sign-up, sign-in only (e-mail + password, Google) behind the `admin` claim, then the whole `v1_questions` pot in one **data table** — shadcn's shape (`columns.tsx`, a generic `DataTable`, a sortable column header) on the engine it is built from, `@tanstack/react-table` v9, but skinned with `src/index.css` rather than Tailwind, which the app has none of. Five columns — question + réponses, auteur, statut, dernière modification le, actions — filtered by status and sorted on the author or the modification stamp, client-side over the snapshot `useQuestions` already streams. The actions follow the status: `pending` takes approuver / rejeter / éditer, `approved` rejeter / éditer, `rejected` approuver / éditer, and a `used` or `demo` question only éditer. Rejeter opens its own modal, since a refusal carries the reason sent back to its author. The author column reads the handle the question carries (`author_username`, denormalized alongside `author_id` — the credit costs no profile read, in the app no more than here), falling back to one profile read per distinct author (`useQuestionAuthors`) for the questions written before that field existed, until `npm run backfill-question-authors` has run in production. That stamp is `v1_questions.updated_at`, written by the backoffice's own writes and by the daily draw, nullable and falling back to `created_at` (`questionLastModifiedAt`) for the questions written before it existed. One modal is shared by « add » and « edit » (an option's ULID is carried through an edit, never regenerated). It deploys to Firebase Hosting — `npm run deploy:admin`, `firebase.json`'s `hosting` block serving `apps/admin/dist` behind the `/admin` + `/admin/**` → `/admin/index.html` rewrites and building it in its own `predeploy`. **The console lives under `/admin/`**: Vite builds two pages (`apps/admin/admin/index.html` for the console, `apps/admin/index.html` for the presentation page — static, no bundle, its own copy of the tokens), and the catch-all `**` → `/index.html` serves the presentation page, so the root of the site is the product and not the backoffice. Five static pages ride along on that site without belonging to the console: `apps/admin/public/legal/{cgu,mentions-legales,confidentialite,assistance,protection-des-enfants}.html`, the app's legal pages — the privacy policy, the support page and the child safety standards being the three the stores require a URL for, the support page carrying the contact address and response times, a FAQ, deleting one's account, reporting a user under the 24-hour delay of App Store guideline 1.2, and the data rights, the last one being Google Play's child safety standards (docs/production-checklist.md §2.8): an explicit CSAE prohibition, the dedicated contact point and the 24-hour handling, in French then in English on the same page, naming StatOwrel and Quentin Machard SAS because Google checks the published standards against the names the Play listing shows — copied to `dist/legal/` by Vite and served past the catch-all rewrite (Hosting serves a file before it rewrites), at `/legal/cgu`, `/legal/mentions-legales`, `/legal/confidentialite`, `/legal/assistance` and `/legal/protection-des-enfants` (plus the `/legal/child-safety` alias) thanks to `cleanUrls`, doubled by six explicit rewrites ahead of the catch-all — without them a clean URL answers 200 *with the presentation page*, which is a routing failure that does not look like one. They carry the publisher's identity in full (Quentin Machard SAS, RCS Laval 891 303 893) and one contact address for everything; `docs/privacy-policy.md` is the source the privacy page was written from and has to be kept in step with it. See `docs/architecture.md` for the intended shape going forward.## Commands
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
npm run seed-demo-question           # writes the onboarding's demo question, tally included
npm run seed-emulator                # fills the running emulator with a whole app: account, day, friends, answers
npm run seed-emulator -- --days 60 --friends 6 --answer-today
npm run seed-emulator -- --dry-run   # ... says what it would write (also --crowd, --email, --password, --seed)
npm run send-test-notification -- --email <email>   # pushes the day's notification to that account's devices
npm run send-test-notification -- --all --dry-run   # ... listing every registered device, sending nothing
npm run send-test-notification -- --email <email> --nudge --friends 3   # ... the 18:00 nudge instead
npm run backfill-question-authors             # stamps v1_questions.author_username from each author's profile
npm run backfill-question-authors -- --dry-run  # ... says what it would write (also --production)
```

**IMPORTANT**: After modifying any file in `packages/models`, ALWAYS run `npm run typecheck` to verify no type errors were introduced across the monorepo.

**IMPORTANT**: There are no PR-gating CI checks. Run `npm run typecheck` and `npm run lint` manually before merging.

**IMPORTANT**: There is only one Firebase project — `.firebaserc` aliases both `default` and `production` to `statowrel-app`. **Development happens on the emulators** (`npm run dev:functions`, then `npm run seed-emulator`), never on the project: every other script writes to the real thing with or without `--production`. `seed-emulator` is the only one that cannot — it refuses both flags and talks to the emulator ports alone. See docs/architecture.md § Environments.

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
- **React Native Firebase** (`@react-native-firebase/{app,auth,firestore,functions}`), not the web `firebase` SDK — see `apps/app/src/lib/firebase.ts` and `docs/architecture.md`. Its modular API mirrors the web SDK's call for call, so the `@statowrel/models` converters work unchanged behind one cast in `src/lib/firestore.ts`. Three things it does differently:
  - **Nothing configures Firebase at runtime.** The default app is created natively at launch off `google-services.json` / `GoogleService-Info.plist` (`apps/app/firebase/`, gitignored, declared per variant by `app.config.ts`). Changing project takes a build, never a Metro restart.
  - **Error codes are namespaced** — `firestore/permission-denied`, not the web SDK's bare `permission-denied`; `auth/*` and `functions/*` are unchanged. There is no `FirebaseError` class to `instanceof`: use `isFirebaseError` / `firebaseErrorCode` from `src/lib/firebaseError.ts`.
  - **Adding a Firebase product is a native module** — a new `@react-native-firebase/*` package means rebuilding the dev client, not just restarting Metro.
- Navigation via [React Navigation 7](https://reactnavigation.org) — native stack + bottom tabs declared in `apps/app/src/navigation/`, entry point `apps/app/index.js` → `src/App.tsx`. Routes are typed through `RootStackParamList` / `TabParamList`, never route strings.
- **Design system**: neobrutalism (reference: [neoflux](https://neobrutalism.com/preview/templates/neoflux)) — bold colors, thick borders, hard offset shadows, and generously rounded corners (`sm` = 8px on the buttons, `DEFAULT` = 12px, up to 32px — never square). Every token — palette, radius, shadows, spacing, type scale, border width — lives in `apps/app/src/design/tokens.ts`, read by the components and the navigation theme alike. Components apply shadows through `apps/app/src/design/shadows.ts`, which hands React Native the CSS `boxShadow` string — the legacy iOS shadow props blur the edge once a surface has a corner radius, `boxShadow` stays crisp; fonts (Archivo Black, Space Grotesk) load via `expo-font` + `@expo-google-fonts/*`. The neobrutalism.com `shadcn` registry itself is web-only (Radix/Base UI need a DOM) — it does not apply to this React Native app; reusable component primitives are hand-built against these tokens (`apps/app/src/components/`) — `Avatar` is one such port, stacking its fallbacks instead of swapping them the way Radix does.

## Testing

There are no tests in this codebase. Do not add test infrastructure without explicit discussion.

## Documentation

- **Architecture**: `docs/architecture.md` — stack decisions, monorepo layout, Firebase project structure, EAS build/submit pipeline.
- **Store listings**: `docs/store-listing.md` — the App Store and Play Store copy, ready to paste, with the character counts each field is bounded by. Written against what 1.0 actually ships: its §7 holds the sentences to add back as the missing features land.
- **Production checklist**: `docs/production-checklist.md` — what stands between the repo and a published app, graded by whether it blocks the store, the product, or neither.
- **Privacy policy**: `docs/privacy-policy.md` — draft, to be reviewed and hosted; the store listings both require its URL.
