# App (`@statowrel/app`)

React Native + Expo (managed workflow) + EAS. iOS + Android. Styled with React Native's own `StyleSheet`, composed from the design tokens.

The authentication flow exists (Google, Apple, email + password, the username sheet that follows a first sign-in, and the `v1_users/{uid}` profile it creates), and behind it the first product screen: **Stats** (`src/stats/`), the root of the app — no tab bar, the profile opens from a header button (docs/prd.md §5.1). Its data is still fixtures. See root `docs/architecture.md` for the overall plan.

**Design system**: neobrutalism visual style (reference: [neoflux](https://neobrutalism.com/preview/templates/neoflux)) — bold flat colors, thick borders, hard offset shadows, and generously rounded corners (`sm` = 8px on the buttons, `DEFAULT` = 12px, up to 32px — never square). Light mode only. Every token — palette, radius, shadows, spacing, type scale, border width — lives in `src/design/tokens.ts`. Headings use `fonts.head` (Archivo Black), body text `fonts.sans` (Space Grotesk) — both loaded via `expo-font` + `@expo-google-fonts/*` in `src/App.tsx`. The neobrutalism.com registry itself (`shadcn` CLI, Radix/Base UI components) targets the web DOM and does **not** work with React Native — component primitives are hand-built against these tokens instead. `Button`, `TextField`, `Card`, `Calendar` and `BottomSheet` exist in `src/components/`, plus the Lottie feedback animations in `src/components/animations/`; the rest lands with the screens that need it.

## Structure

- `index.js` — entry point: `registerRootComponent(App)`.
- `src/App.tsx` — root component. Loads the fonts, then `SafeAreaProvider` → `GestureHandlerRootView` → `NavigationContainer` (ref, theme, deep links) → `AuthProvider` → `RootNavigator`, holding the splash screen until the persisted session resolves.
- `src/navigation/` — [React Navigation 7](https://reactnavigation.org), same layout as `qmachard/checkpack-v3`. `RootNavigator.tsx` is a native stack that registers **only** the half of the app the session can reach (`SignIn`/`SignUp` signed out, `Stats`/`Profile` signed in). There is no tab navigator: Stats is the root and Profile stacks on top of it (docs/prd.md §5.1), which is why `ProfileScreen` carries its own back button. `types.ts` holds the param list (also registered globally as `ReactNavigation.RootParamList`), `linking.ts` the deep-link map, `navigationRef.ts` the imperative ref, `theme.ts` the container theme built from the design tokens.
- `src/design/tokens.ts` — the neobrutalism palette plus the `radius`, `shadows`, `fontSize` and `borderWidth` scales, the `fonts`, and `spacing(steps)` (one step = 4px). Read by every component's `StyleSheet.create` block *and* by the navigator chrome. One source, no drift.
- `src/design/shadows.ts` — the hard offset shadows as React Native styles, built from those tokens.
- `src/auth/` — everything authentication. `AuthContext.tsx` (`useAuth()`: `user`, `profile`, `initializing`, `needsOnboarding`, `completeOnboarding`), `providers.ts` (Google / Apple / email primitives + `signOut`), `profile.ts` (`syncUserProfile` reads and mirrors Auth back, `createUserProfile` claims the username then writes `v1_users/{uid}` — **id = Firebase Auth UID**), `schemas.ts` (zod), `errors.ts` (French messages for `auth/*` codes), `SocialSignInButtons.tsx`, `OnboardingSheet.tsx` (the blocking username sheet, docs/prd.md §4.1), `screens/` (`SignInScreen`, `SignUpScreen`, `ProfileScreen`).
- `src/stats/` — the Stats screen (docs/prd.md §5.2), the app's root. `screens/StatsScreen.tsx` composes `components/` (`StatsHeader`, `StreakCard`, `StatTile`, `StatsCalendar` + its `CalendarDay` and `Hatch`, `DevFixtureSwitch`), `helpers/calendarState.ts` derives the four day states, and `data/` is the whole data source: `fixtures.ts` holds two fake sets typed on `UserData` / `DailyQuestionAnswerData`, `useStatsData.ts` picks one. Wiring Firestore in means rewriting `useStatsData` alone — the components already consume the model types.
- `src/components/` — neobrutalism primitives (`Button`, `TextField`, `Card`, `Calendar`, `BottomSheet`). `Card` and `Calendar` are React Native ports of the [neobrutalism.com](https://neobrutalism.com/docs/components/card) components: same anatomy, minus the `has-*` variants and the DOM-only `react-day-picker`. An icon-only button is `Button` at an `icon*` size, not a separate component.
- `src/components/animations/` — the Lottie feedback animations, on `lottie-react-native` (a **native** module: adding it means rebuilding the dev client). `sources.ts` is the registry of the `assets/lottie/` compositions, `Animation.tsx` the sized wrapper reading it, and `SuccessCircle` / `SuccessCheck` / `Star` the presets that pick a composition. A new animation is a JSON in `assets/lottie/` plus a line in the registry.
- `src/lib/dates.ts` — local-calendar helpers keyed on the model's `YYYY-MM-DD` strings, plus the French month/weekday labels. No UTC round-trip: `toISOString()` would move the day.
- `src/lib/firebase.ts` — Firebase client SDK (`firebase` npm package, not `@react-native-firebase`) init: `app`, `auth` (persisted via `@react-native-async-storage/async-storage`), `db`, plus the Auth and Firestore emulator hookups. Same client SDK the rest of the monorepo uses, so `@statowrel/models` converters work unchanged.
- `src/lib/firestore.ts` — `getDocumentRef` / `getCollectionRef`, each wired with a `@statowrel/models` converter. Use these rather than calling `doc()`/`collection()` directly.
- `app.config.ts` — dynamic Expo config. Reads `APP_VARIANT` (`development` | `preview` | `production`, set per EAS build profile in `eas.json`) to pick app name / bundle identifier / package name, so dev/preview/prod can be installed side-by-side on a device.
- `eas.json` — EAS Build & Submit profiles: `development` (dev client, internal), `preview` (internal), `production` (store-ready, auto-incremented build number).

## Conventions

- Style with a `StyleSheet.create` block colocated at the top of the component file, built from `src/design/tokens.ts` — never a raw hex, a magic padding or a hardcoded font name. Variant maps (per-variant surfaces, per-size paddings) are `StyleSheet.create` records keyed by the variant, composed through a style array at the call site.
- A reusable component takes a `style` prop for **layout only** (`flex`, margins); its surface and its shadow stay props of the component (`variant` / `shadow` on `Card`), so a caller can't half-override a variant.
- Firestore reads/writes ALWAYS go through a converter from `@statowrel/models` — use `getDocumentRef` / `getCollectionRef` from `src/lib/firestore.ts`, never read `snap.data()` untyped.
- Forms use `react-hook-form` + `zod` via `@hookform/resolvers/zod`, never raw `useState`.
- Auth session state comes from `useAuth()`; never call `onAuthStateChanged` from a screen.
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
