# FireCMS (`@statowrel/firecms`)

Backoffice for StatOwrel. React 18 + Vite (SPA) + FireCMS v2 + MUI. Deployed to Firebase Hosting.

## Structure

- `src/firebase-config.ts` — reads `VITE_FIREBASE_*` env vars, passed to `<FirebaseCMSApp firebaseConfig={...} />`.
- `src/authenticator/admin.ts` — gate: only allows sign-in for allow-listed admin emails (`Authenticator<FirebaseUser>`).
- `src/collections/index.ts` — the list of `EntityCollection` definitions rendered as the CMS's left nav. Empty until domain models exist in `@statowrel/models`.
- `src/App.tsx` — mounts `<FirebaseCMSApp />`, wires the Firestore/Auth emulators when `VITE_FIREBASE_*_EMULATOR_HOST` env vars are set.

## Adding a collection

One file per `v1_*` Firestore collection under `src/collections/`, following FireCMS's `buildCollection<T>()` API, using the corresponding converter and `*_COLLECTION` constant from `@statowrel/models`. Import and add it to the array in `src/collections/index.ts`.

## Local development

```bash
npm run dev            # Vite dev server on :3002
npm run dev:firecms    # same, run from the repo root via turbo
```

Point `VITE_FIREBASE_*_EMULATOR_HOST`/`_PORT` env vars at the Functions emulator suite (`apps/functions`) to develop against local data.

## Validation

Always run before considering a change complete:

```bash
npm run typecheck
npm run lint
```
