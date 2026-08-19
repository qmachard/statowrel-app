# App (`@statowrel/app`)

React Native + Expo (managed workflow) + EAS. iOS + Android. Styled with [Nativewind](https://www.nativewind.dev) (Tailwind CSS for React Native).

No screens or domain models exist yet — this app is scaffolding only (routing shell, Firebase wiring, build/submit pipeline). See root `docs/architecture.md` for the overall plan.

**Design system**: not installed yet. The app is planned to use a neobrutalism visual style (reference: [neoflux](https://neobrutalism.com/preview/templates/neoflux)) — bold flat colors, thick borders, hard offset shadows — but the theme tokens, fonts, and component primitives are a separate, later step. `tailwind.config.js` currently has no custom theme.

## Structure

- `app/` — [Expo Router](https://docs.expo.dev/router/introduction/) file-based routes. `_layout.tsx` is the root layout (wraps the app in `SafeAreaProvider`, imports `global.css`). Add screens as `app/<route>.tsx` / `app/<route>/_layout.tsx`.
- `src/lib/firebase.ts` — Firebase client SDK (`firebase` npm package, not `@react-native-firebase`) init: `app`, `auth` (persisted via `@react-native-async-storage/async-storage`), `db`. Same client SDK the rest of the monorepo uses, so `@statowrel/models` converters work unchanged.
- `tailwind.config.js` — Nativewind preset, no custom theme yet. Design tokens (palette, shadows, borders) are added later, in a dedicated design-system step.
- `global.css` — Tailwind directives, imported once in `app/_layout.tsx`.
- `app.config.ts` — dynamic Expo config. Reads `APP_VARIANT` (`development` | `preview` | `production`, set per EAS build profile in `eas.json`) to pick app name / bundle identifier / package name, so dev/preview/prod can be installed side-by-side on a device.
- `eas.json` — EAS Build & Submit profiles: `development` (dev client, internal), `preview` (internal), `production` (store-ready, auto-incremented build number).

## Conventions

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

Requires the Expo Go app or a dev client build (`npm run build:dev:ios` / `build:dev:android`) to run on a device/simulator — Firebase Auth's native persistence and most Firebase features work in Expo Go too since this app uses the JS `firebase` SDK, not native modules.

## EAS Build & Submit

Requires `eas login` once, and an EAS project linked (`eas init`) with `EAS_PROJECT_ID` set in `apps/app/.env.local` / EAS secrets.

```bash
npm run build:dev:ios       # eas build --profile development --platform ios
npm run build:dev:android
npm run build:preview:ios
npm run build:preview:android
npm run build:prod:ios      # eas build --profile production --platform ios
npm run build:prod:android
npm run submit:prod         # submit:prod:ios + submit:prod:android
```

All of the above are also exposed as root-level `npm run <script>` commands via Turbo (see root `package.json`).

## Validation

```bash
npm run typecheck
npm run lint
```
