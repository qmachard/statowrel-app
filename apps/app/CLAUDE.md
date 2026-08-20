# App (`@statowrel/app`)

React Native + Expo (managed workflow) + EAS. iOS + Android. Styled with React Native's own `StyleSheet`, composed from the design tokens.

The authentication flow exists (Google, Apple, email + password, the username sheet that follows a first sign-in, and the `v1_users/{uid}` profile it creates), and behind it the first product screen: **Stats** (`src/stats/`), the root of the app — no tab bar, the profile opens from a header button (docs/prd.md §5.1). It reads Firestore. See root `docs/architecture.md` for the overall plan.

**Design system**: neobrutalism visual style (reference: [neoflux](https://neobrutalism.com/preview/templates/neoflux)) — bold flat colors, thick borders, hard offset shadows, and generously rounded corners (`sm` = 8px on the buttons, `DEFAULT` = 12px, up to 32px — never square). Light mode only. Every token — palette, radius, shadows, spacing, type scale, border width — lives in `src/design/tokens.ts`; `rare` and `ultra` are the only colours outside the identity palette, and they exist as the StatOwrel card's rarity liserés (docs/prd.md §5.5), never as a surface. Headings use `fonts.head` (Archivo Black), body text `fonts.sans` (Space Grotesk) — both loaded via `expo-font` + `@expo-google-fonts/*` in `src/App.tsx`. The neobrutalism.com registry itself (`shadcn` CLI, Radix/Base UI components) targets the web DOM and does **not** work with React Native — component primitives are hand-built against these tokens instead. `Button`, `TextField`, `Card`, `Calendar` and `BottomSheet` exist in `src/components/`, plus the Lottie feedback animations in `src/components/animations/`; the rest lands with the screens that need it.

## Structure

- `index.js` — entry point: `registerRootComponent(App)`.
- `src/App.tsx` — root component. Loads the fonts, then `SafeAreaProvider` → `GestureHandlerRootView` → `NavigationContainer` (ref, theme, deep links) → `AuthProvider` → `RootNavigator`, holding the splash screen until the persisted session resolves.
- `src/navigation/` — [React Navigation 7](https://reactnavigation.org), same layout as `qmachard/checkpack-v3`. `RootNavigator.tsx` is a native stack that registers **only** the half of the app the session can reach (`SignIn`/`SignUp` signed out, `Stats`/`DailyQuestion`/`InviteFriend`/`Profile` signed in). There is no tab navigator: Stats is the root and Profile stacks on top of it (docs/prd.md §5.1), which is why `ProfileScreen` carries its own back button. `types.ts` holds the param list (also registered globally as `ReactNavigation.RootParamList`), `linking.ts` the deep-link map, `navigationRef.ts` the imperative ref, `theme.ts` the container theme built from the design tokens.
- `src/design/tokens.ts` — the neobrutalism palette plus the `radius`, `shadows`, `fontSize` and `borderWidth` scales, the `fonts`, and `spacing(steps)` (one step = 4px). Read by every component's `StyleSheet.create` block *and* by the navigator chrome. One source, no drift.
- `src/design/shadows.ts` — the hard offset shadows as React Native styles, built from those tokens.
- `src/auth/` — everything authentication. `AuthContext.tsx` (`useAuth()`: `user`, `profile`, `initializing`, `needsOnboarding`, `completeOnboarding` — `profile` is a **subscription** to `v1_users/{uid}`, since the answer trigger moves its counters), `providers.ts` (Google / Apple / email primitives + `signOut`), `profile.ts` (`syncUserProfile` reads and mirrors Auth back, `createUserProfile` claims the username then writes `v1_users/{uid}` — **id = Firebase Auth UID**), `schemas.ts` (zod), `errors.ts` (French messages for `auth/*` codes), `SocialSignInButtons.tsx`, `OnboardingSheet.tsx` (the blocking username sheet, docs/prd.md §4.1), `screens/` (`SignInScreen`, `SignUpScreen`, `ProfileScreen`).
- `src/stats/` — the Stats screen (docs/prd.md §5.2), the app's root. `screens/StatsScreen.tsx` composes `components/` (`StatsHeader`, `DailyQuestionBanner`, `StatsStrip` holding `StreakCard` and the two `StatTile`s, `StatsCalendar` + its `CalendarDay` and `Hatch`), `helpers/calendarState.ts` derives the four day states and `helpers/streak.ts` the streak actually worth showing, and `data/useStatsData.ts` is the whole data source.

  **The calendar costs two documents a month, and that is the point.** The streak, the record and the answered-days total come from the `v1_users/{uid}` document `AuthContext` already subscribes to — free here. The displayed month is `v1_daily_question_months/{YYYY-MM}` (which days had a question) plus `v1_users/{uid}/v1_user_calendar_months/{YYYY-MM}` (which days this user answered, with the `stat_label` the cell renders). Never query `v1_daily_question_answers` for a month: that is one read per answered day plus its question to join, which is exactly what those two documents exist to avoid.

  **The current month is subscribed to, a past month is read once.** Only the current one changes — the scheduler adds a day at 07:00, the answer trigger writes the user's half a beat after the app writes an answer — and a subscription costs the same first read as a `getDoc`, plus one per change. A past month is frozen, so it is fetched once and kept for the rest of the screen's life: a chevron back to March costs two reads the first time and nothing after. Leaving a listener on every visited month would hold a connection per month to hear about changes that never come.

  The daily-question banner rides along on the same two documents — its label is copied onto the month index and "already answered" is a day of the user's month, or an answer this session has just written — so it costs nothing either. It reads the *current* month rather than the displayed one, which is why `useStatsData` returns `todayQuestion` and `answeredToday` beside `calendar`: browsing back to March must not make today's question vanish from the top of the screen.
- `src/daily-question/` — one day's question (docs/prd.md §5.4), the sheet that lands on top of Stats. `screens/DailyQuestionScreen.tsx` puts the close button on its own line and the question under it as the sheet's title — no label above it — and owns the **double tap** of §4.3 — first tap selects, second one validates behind a 150 ms guard — `components/QuestionOption.tsx` renders the two states it drives, and `data/` is the day: `useDailyQuestion.ts` reads `v1_daily_question_months/{YYYY-MM}` once to learn which question ran the day — a day's entry never changes — then subscribes to that `v1_questions` document (its `answer_counts` moves on every answer, and the 07:00 drop then lands on a screen already open) and to the answer. `submitAnswer.ts` writes the answer at `v1_questions/{question_id}/v1_daily_question_answers/{uid}` (**document id = the Firebase Auth UID**, which is what makes one answer per person per day a property of the data — one question is one day), dating it with the question's own `broadcast_on` and flagging `late` against its `closes_at`, since those are the values the rules check. `answerStore.ts` covers the one gap a subscription cannot: the Stats banner reads the calendar month, which the answer trigger writes a beat later, so the answer this session wrote counts on its own until the projection catches up. The write is the app's only one under a question: `answer_counts`, the calendar month and the streak all belong to the answer trigger.

  **An answered day shows the card, not the question.** The sheet's content forks on the answer — one branch covering both the flip after the second tap and the read-only reopening from the calendar, since both are « there is an answer ». `components/StatOwrelCard.tsx` is the card of §5.5 (double frame, `stat_label` and its percentage across the top, the question recessed under it, the distribution as `StatOwrelBar` rows, a dated foot) and `helpers/statowrel.ts` the computation behind it. Two things that helper does on purpose: it folds this user's own answer into the counts, because the answer trigger increments `answer_counts` a beat after the app writes the answer and the card would otherwise open on « 0% »; and it sums over the question's own options rather than over every key of the map, so a stale key cannot inflate a denominator. Rarity is never stored — it is that map's shape at display time, which is why the question is subscribed to.
- `src/friends/` — inviting a friend by handle (docs/prd.md §4.1), the « Inviter un pote » button of the Stats header. `screens/InviteFriendScreen.tsx` is a dismissable `formSheet` sized by its own content, like the daily question and unlike the blocking onboarding sheet — nothing is blocked on inviting somebody. It is the app's only feature that **writes nothing itself**: `data/inviteFriend.ts` calls the `friends-inviteFriend` callable, which resolves the handle and writes both halves of the friendship. Everything that fails lands under the field, because the handle is the only thing the user can change here — `errors.ts` maps the `functions/*` codes to French the way `src/auth/errors.ts` maps `auth/*`, and an unknown handle and a malformed one share one sentence on purpose (there is no public search, so both mean « personne ne s'appelle comme ça »). Once it has been through, the form is replaced by what happened rather than left standing with a message under it.

- `src/lib/functions.ts` — the callable client: `getFunctions(app, REGION)` with the emulator hookup, and `callFunction(name, payload)` typed through the contract of `@statowrel/models`'s `callables.ts`. `REGION` mirrors the backend's `REGION_CLOUD` — a mismatch is a runtime 404, not a compile error, so the two are changed together.

- `src/components/` — neobrutalism primitives (`Button`, `TextField`, `Card`, `Calendar`, `BottomSheet`). `Card` and `Calendar` are React Native ports of the [neobrutalism.com](https://neobrutalism.com/docs/components/card) components: same anatomy, minus the `has-*` variants and the DOM-only `react-day-picker`. An icon-only button is `Button` at an `icon*` size, not a separate component.
- `src/components/animations/` — the Lottie feedback animations, on `lottie-react-native` (a **native** module: adding it means rebuilding the dev client). `sources.ts` is the registry of the `assets/lottie/` compositions, `Animation.tsx` the sized wrapper reading it (its `replayDelay` holds the last frame before playing again — Lottie's own `loop` restarts on the next frame), and `SuccessCircle` / `SuccessCheck` / `Star` the presets that pick a composition. A new animation is a JSON in `assets/lottie/` plus a line in the registry.
- `src/components/illustrations/` — static SVG art on `react-native-svg`, sized by a plain `size` in pixels. `StarPeeled` is the mark the star sticker leaves when it comes off, traced from the contour of `assets/lottie/star.json` and kept in that composition's 512×512 canvas so it lands where the animation sat. Anything that does not move belongs here rather than in `animations/`.
- `src/lib/haptics.ts` — the light / heavy+success taps of the double tap (docs/prd.md §4.3). `expo-haptics` is required lazily and every call swallows its failure, so a device with haptics off still validates.
- `src/lib/dates.ts` — local-calendar helpers keyed on the model's `YYYY-MM-DD` strings, plus the French month/weekday labels. No UTC round-trip: `toISOString()` would move the day.
- `src/lib/firebase.ts` — Firebase client SDK (`firebase` npm package, not `@react-native-firebase`) init: `app`, `auth` (persisted via `@react-native-async-storage/async-storage`), `db`, plus the Auth and Firestore emulator hookups. Same client SDK the rest of the monorepo uses, so `@statowrel/models` converters work unchanged.
- `src/lib/firestore.ts` — `getDocumentRef` / `getSubDocumentRef` / `getCollectionRef`, each wired with a `@statowrel/models` converter. Use these rather than calling `doc()`/`collection()` directly.
- `app.config.ts` — dynamic Expo config. Reads `APP_VARIANT` (`development` | `preview` | `production`, set per EAS build profile in `eas.json`) to pick app name / bundle identifier / package name, so dev/preview/prod can be installed side-by-side on a device.
- `eas.json` — EAS Build & Submit profiles: `development` (dev client, internal), `preview` (internal), `production` (store-ready, auto-incremented build number).

## Conventions

- Style with a `StyleSheet.create` block colocated at the top of the component file, built from `src/design/tokens.ts` — never a raw hex, a magic padding or a hardcoded font name. Variant maps (per-variant surfaces, per-size paddings) are `StyleSheet.create` records keyed by the variant, composed through a style array at the call site.
- A reusable component takes a `style` prop for **layout only** (`flex`, margins); its surface and its shadow stay props of the component (`variant` / `shadow` on `Card`), so a caller can't half-override a variant.
- Firestore reads/writes ALWAYS go through a converter from `@statowrel/models` — use `getDocumentRef` / `getCollectionRef` from `src/lib/firestore.ts`, never read `snap.data()` untyped.
- Forms use `react-hook-form` + `zod` via `@hookform/resolvers/zod`, never raw `useState`.
- Auth session state comes from `useAuth()`; never call `onAuthStateChanged` from a screen.
- Anything a backend trigger writes is **subscribed to**, not read: `v1_users/{uid}`, the current calendar month and a broadcast question's `answer_counts` all move after the app writes an answer, and a `getDoc` would have to guess when. Read once instead when the document is settled — a past calendar month, a month's index of broadcast days. A hook that resets state at the top of an effect to switch keys trips `react-hooks`; carry the key on the state and derive what is current, as `useDailyQuestion` does.
- Public env vars (safe to embed in the client bundle) are prefixed `EXPO_PUBLIC_` and read via `process.env` — see `.env.example`. Never put a secret behind `EXPO_PUBLIC_*`.
- A screen is a named export in `src/<domain>/screens/<Name>Screen.tsx`, registered in `src/navigation/`. Navigate with `useNavigation()`; add the route to `RootStackParamList` first, so the call is type-checked.
- Every dependency Expo manages must stay on the version its SDK bundles (`npx expo install --check`) — a newer major of a native module is a broken native build, not an upgrade.

## Local development

```bash
npm install
cp apps/app/.env.example apps/app/.env.local   # Firebase web app config + Google OAuth client ids
npm run dev:app          # or: npm run dev --workspace=@statowrel/app
```

Requires a dev client build (`npm run build:dev:ios` / `build:dev:android`) to run on a device/simulator — `expo-dev-client` is installed, so Expo Go is no longer the supported target. Firebase itself needs no native linking (this app uses the JS `firebase` SDK), but Google and Apple sign-in do (`@react-native-google-signin/google-signin`, `expo-apple-authentication`), so the dev client must be rebuilt after changing their config.

Google sign-in needs three public OAuth identifiers: `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (the one Firebase mints id tokens for), `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, and `EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME` (the reversed iOS client id). Leave them empty and the Google button hides itself; the rest of the app still runs.

They have to be declared **twice**, because two different processes read them and neither sees the other's source:

- `.env.local` — read by Metro when you run the app locally.
- the build profile's `env` block in `eas.json` — read when EAS builds the binary. `.env.local` is gitignored, and EAS excludes gitignored files from the upload, so a value that only lives there is simply absent on the builder.

That distinction matters most for `EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME`: `app.config.ts` reads it at **config-evaluation** time to register the URL scheme natively. Miss it on the builder and the binary ships without the scheme while the JS bundle still believes Google is configured — the native SDK then fails on tap with "Your app is missing support for the following URL schemes". Changing it always requires a new build, never just a Metro restart.

The iOS client id and its URL scheme are bound to a bundle identifier, so each variant needs its own pair. Only `development` has one today; `preview` and `production` carry the (project-wide) web client id alone, which keeps the button hidden there until their own iOS OAuth clients exist.

## EAS Build & Submit

Requires `eas login` once. The EAS project is already linked — `@qmachard/statowrel-app`, its `projectId` is hardcoded in `app.config.ts` under `extra.eas.projectId` (a public identifier, not a secret; the dynamic config means EAS can't write it there itself). The `slug` must stay `statowrel-app` to match that project.

```bash
npm run build:dev:ios       # eas build --profile development --platform ios
npm run build:dev:android
npm run build:preview:ios
npm run build:preview:android
npm run build:prod:ios      # eas build --profile production --platform ios
npm run build:prod:android
npm run submit:prod         # submit:prod:ios + submit:prod:android
```

All of the above are also exposed as root-level `npm run <script>` commands (see root `package.json`). They deliberately bypass Turbo and call the workspace script directly (chained after `build:models`, since `@statowrel/models` resolves to `dist/`): `eas build` / `eas submit` are interactive, and Turbo only forwards stdin to a task under its full-screen TUI.

## Validation

```bash
npm run typecheck
npm run lint
```
