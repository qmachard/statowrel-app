# App (`@statowrel/app`)

React Native + Expo (managed workflow) + EAS. iOS + Android. Styled with [Nativewind](https://www.nativewind.dev) (Tailwind CSS for React Native).

The authentication flow exists (Google, Apple, email + password, and the `v1_users/{uid}` profile it creates), behind it a two-tab navigator with a placeholder home and a profile screen; no product screen does yet. See root `docs/architecture.md` for the overall plan.

**Design system**: neobrutalism visual style (reference: [neoflux](https://neobrutalism.com/preview/templates/neoflux)) — bold flat colors, thick borders, hard offset shadows, and slightly rounded corners (`rounded` = 4px — not square). The palette, the radius scale **and** the shadow scale live in `src/design/tokens.js`; the rest (`font-head`/`font-sans`, `borderWidth`) in `tailwind.config.js`. Headings use `font-head` (Archivo Black), body text uses `font-sans` (Space Grotesk) — both loaded via `expo-font` + `@expo-google-fonts/*` in `src/App.tsx`. The neobrutalism.com registry itself (`shadcn` CLI, Radix/Base UI components) targets the web DOM and does **not** work with React Native — component primitives are hand-built against these tokens instead. `src/components/Button.tsx` and `src/components/TextField.tsx` exist; the rest lands with the screens that need it.

## Structure

- `index.js` — entry point: `registerRootComponent(App)`.
- `src/App.tsx` — root component. Imports `global.css`, loads the fonts, then `SafeAreaProvider` → `GestureHandlerRootView` → `NavigationContainer` (ref, theme, deep links) → `AuthProvider` → `RootNavigator`, holding the splash screen until the persisted session resolves.
- `src/navigation/` — [React Navigation 7](https://reactnavigation.org), same layout as `qmachard/checkpack-v3`. `RootNavigator.tsx` is a native stack that registers **only** the half of the app the session can reach (`SignIn`/`SignUp` signed out, `Tabs` signed in), `TabNavigator.tsx` the bottom tabs (`Home`, `Profile`), `types.ts` the param lists (also registered globally as `ReactNavigation.RootParamList`), `linking.ts` the deep-link map, `navigationRef.ts` the imperative ref, `theme.ts` the container theme built from the design tokens.
- `src/design/tokens.js` — the neobrutalism palette, corner-radius and hard-shadow scales, in CommonJS so `tailwind.config.js` can `require()` it while TypeScript imports the same values for the navigator chrome. One source, no drift.
- `src/design/shadows.ts` — the hard offset shadows as React Native styles, built from those tokens.
- `src/auth/` — everything authentication. `AuthContext.tsx` (`useAuth()`: `user`, `profile`, `initializing`), `providers.ts` (Google / Apple / email primitives + `signOut`), `profile.ts` (upserts `v1_users/{uid}` — **id = Firebase Auth UID**), `profileHints.ts`, `schemas.ts` (zod), `errors.ts` (French messages for `auth/*` codes), `SocialSignInButtons.tsx`, `screens/` (`SignInScreen`, `SignUpScreen`, `ProfileScreen`).
- `src/home/screens/` — `HomeScreen`, the placeholder the daily question will replace.
- `src/components/` — neobrutalism primitives (`Button`, `TextField`).
- `src/lib/firebase.ts` — Firebase client SDK (`firebase` npm package, not `@react-native-firebase`) init: `app`, `auth` (persisted via `@react-native-async-storage/async-storage`), `db`, plus the Auth and Firestore emulator hookups. Same client SDK the rest of the monorepo uses, so `@statowrel/models` converters work unchanged.
- `src/lib/firestore.ts` — `getDocumentRef` / `getCollectionRef`, each wired with a `@statowrel/models` converter. Use these rather than calling `doc()`/`collection()` directly.
- `tailwind.config.js` — Nativewind preset + neobrutalism theme tokens: the palette, `borderRadius` and `boxShadow` scales from `src/design/tokens.js`, plus `font-head`/`font-sans` and a thick `borderWidth`.
- `src/global.css` — Tailwind directives, imported once in `src/App.tsx`.
- `app.config.ts` — dynamic Expo config. Reads `APP_VARIANT` (`development` | `preview` | `production`, set per EAS build profile in `eas.json`) to pick app name / bundle identifier / package name, so dev/preview/prod can be installed side-by-side on a device.
- `eas.json` — EAS Build & Submit profiles: `development` (dev client, internal), `preview` (internal), `production` (store-ready, auto-incremented build number).

## Conventions

- Use `className` (Nativewind) for styling, not `StyleSheet.create`, unless a style genuinely can't be expressed in Tailwind (complex platform-specific values) — in which case colocate it with `useMemo`/`StyleSheet.create` next to the component.
- NEVER apply a Tailwind utility that **declares a CSS variable** conditionally (after the initial render) — the transforms (`translate-*`, `scale-*`, `rotate-*`, `skew-*`), `shadow-*` and `ring-*`. Nativewind then prints an "upgrade" warning whose serialiser walks the props recursively, reaches React Navigation's context object and trips its throwing getters: the app red-screens with "Couldn't find a navigation context". Express such a state change as a React Native style instead — see `SUNK` in `src/components/Button.tsx`.
- Firestore reads/writes ALWAYS go through a converter from `@statowrel/models` — use `getDocumentRef` / `getCollectionRef` from `src/lib/firestore.ts`, never read `snap.data()` untyped.
- Forms use `react-hook-form` + `zod` via `@hookform/resolvers/zod`, never raw `useState`.
- Auth session state comes from `useAuth()`; never call `onAuthStateChanged` from a screen.
- Public env vars (safe to embed in the client bundle) are prefixed `EXPO_PUBLIC_` and read via `process.env` — see `.env.example`. Never put a secret behind `EXPO_PUBLIC_*`.
- A screen is a named export in `src/<domain>/screens/<Name>Screen.tsx`, registered in `src/navigation/`. Navigate with `useNavigation<NativeStackNavigationProp<RootStackParamList>>()`; add the route to `RootStackParamList` / `TabParamList` first, so the call is type-checked.
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
