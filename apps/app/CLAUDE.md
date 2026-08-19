# App (`@statowrel/app`)

React Native + Expo (managed workflow) + EAS. iOS + Android. Styled with [Nativewind](https://www.nativewind.dev) (Tailwind CSS for React Native).

One screen exists: the Stats home (`app/index.tsx`, docs/prd.md §5.2) — streak block, record, month calendar — rendered from placeholder data in `src/data/fakeStats.ts`, typed against the real `@statowrel/models` shapes so the Firestore wiring is a source swap. Everything else is still scaffolding (routing shell, Firebase wiring, build/submit pipeline). See root `docs/architecture.md` for the overall plan.

**Design system**: neobrutalism visual style (reference: [neoflux](https://neobrutalism.com/preview/templates/neoflux)) — bold flat colors, thick borders, hard offset shadows, `radius: 0`. Theme tokens (palette, `font-head`/`font-sans`, `borderRadius`, `borderWidth`, `boxShadow`) live in `tailwind.config.js`. Headings use `font-head` (Archivo Black), body text uses `font-sans` (Space Grotesk) — both loaded via `expo-font` + `@expo-google-fonts/*` in `app/_layout.tsx`. The neobrutalism.com registry itself (`shadcn` CLI, Radix/Base UI components) targets the web DOM and does **not** work with React Native — component primitives (Button, Card, Input, …) are hand-built against these tokens as a separate, later step.

## Structure

- `app/` — [Expo Router](https://docs.expo.dev/router/introduction/) file-based routes. `_layout.tsx` is the root layout (imports `global.css`, holds the splash screen while the fonts load). It must render its navigator on the **first** render — returning `null` while resources load, or nesting a second `SafeAreaProvider` (expo-router's `ExpoRoot` already provides one, and a nested one renders `null` until the native insets arrive), leaves the NavigationContainer without a navigator and throws "Couldn't find a navigation context" on device. Add screens as `app/<route>.tsx` / `app/<route>/_layout.tsx`.
- `src/components/` — screen-level building blocks (`StatsHeader`, `StreakCard`, `StatTile`, `MonthCalendar`, `DayCell`) plus the `StickerButton` primitive and the `icons/` sticker set, PascalCase, one component per file, styled with the `tailwind.config.js` tokens only.
- `src/theme/colors.js` — the palette (cream, golden yellow, bubblegum pink, black), in plain CommonJS so both `tailwind.config.js` (loaded by Node, outside Babel) and the app runtime read the same values. Sticker icons take a fill string rather than a class, so they need the palette at runtime; `colors.d.ts` types it.
- `src/lib/` — framework-free helpers (`calendar.ts`: `YYYY-MM-DD` day keys and the month grid).
- `src/data/` — placeholder datasets standing in for Firestore reads, typed against `@statowrel/models`. Delete a file here as soon as its screen is wired up for real.
- `src/lib/firebase.ts` — Firebase client SDK (`firebase` npm package, not `@react-native-firebase`) init: `app`, `auth` (persisted via `@react-native-async-storage/async-storage`), `db`. Same client SDK the rest of the monorepo uses, so `@statowrel/models` converters work unchanged.
- `tailwind.config.js` — Nativewind preset + neobrutalism theme tokens (`font-head`/`font-sans`, `borderRadius: 0`, thick `borderWidth`, hard offset `boxShadow` scale). The palette itself comes from `src/theme/colors.js`.
- `global.css` — Tailwind directives, imported once in `app/_layout.tsx`.
- `app.config.ts` — dynamic Expo config. Reads `APP_VARIANT` (`development` | `preview` | `production`, set per EAS build profile in `eas.json`) to pick app name / bundle identifier / package name, so dev/preview/prod can be installed side-by-side on a device.
- `eas.json` — EAS Build & Submit profiles: `development` (dev client, internal), `preview` (internal), `production` (store-ready, auto-incremented build number).

## Conventions

- Icons are hand-built SVG stickers in `src/components/icons/shapes.tsx` (backed by `react-native-svg`) — never emoji, and no icon library: an off-the-shelf set is drawn as thin uniform strokes, which disappears next to 2px borders and hard offset shadows. Each shape is closed and takes a `fill` from `@/theme/colors`. Wrap it in `<Sticker>` for the offset shadow copy, or in `<StickerButton>` for the round disc button.
- Use `className` (Nativewind) for styling, not `StyleSheet.create`, unless a style genuinely can't be expressed in Tailwind (complex platform-specific values) — in which case colocate it with `useMemo`/`StyleSheet.create` next to the component.
- Firestore reads/writes ALWAYS go through a converter from `@statowrel/models` (`getDoc(doc(db, ...).withConverter(converter(Timestamp, GeoPoint)))`) — never read `snap.data()` untyped.
- Public env vars (safe to embed in the client bundle) are prefixed `EXPO_PUBLIC_` and read via `process.env` — see `.env.example`. Never put a secret behind `EXPO_PUBLIC_*`.
- `expo-router` typed routes are enabled (`experiments.typedRoutes` in `app.config.ts`) — prefer `Href` types over raw strings when navigating.

## Local development

```bash
npm install
cp apps/app/.env.example apps/app/.env.local   # fill in Firebase web app config
npm run dev:app          # or: npm run dev --workspace=@statowrel/app
```

Requires a dev client build (`npm run build:dev:ios` / `build:dev:android`) to run on a device/simulator — `expo-dev-client` is installed, so Expo Go is no longer the supported target. Firebase itself needs no native linking (this app uses the JS `firebase` SDK), so the dev client only needs rebuilding when a native dependency changes.

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
