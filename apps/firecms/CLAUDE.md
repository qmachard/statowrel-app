# FireCMS (`@statowrel/firecms`)

Backoffice for StatOwrel. React 18 + Vite (SPA) + FireCMS v2 + MUI. Deployed to Firebase Hosting.

## Structure

- `src/firebase-config.ts` — reads `VITE_FIREBASE_*` env vars, passed to `<FirebaseCMSApp firebaseConfig={...} />`.
- `src/authenticator/admin.ts` — gate: only allows sign-in for allow-listed admin emails (`Authenticator<FirebaseUser>`).
- `src/collections/index.ts` — the list of `EntityCollection` definitions rendered as the CMS's left nav.
- `src/collections/questions.ts` — the `v1_question` collection; the reference to copy when adding a new one.
- `src/App.tsx` — mounts `<FirebaseCMSApp />`, wires the Firestore/Auth emulators when `VITE_FIREBASE_*_EMULATOR_HOST` env vars are set.

## Adding a collection

One file per `v1_*` Firestore collection under `src/collections/`, following FireCMS's `buildCollection<T>()` API, using the `*_COLLECTION` constant from `@statowrel/models`. Import and add it to the array in `src/collections/index.ts`.

Two gotchas, both visible in `questions.ts`:

- **Do not type the collection with the model's `*Data` type directly.** FireCMS reads Firestore with its own data source (`Timestamp` → `Date`), not with the model's converter (`Timestamp` → ISO `string`). Declare a local type that overrides the timestamp fields with `Date`.
- **A map with dynamic keys needs `keyValue: true`** and an explicit generic on `buildProperty` (`buildProperty<Record<string, XData>>({ dataType: 'map', keyValue: true, ... })`) — without the generic, FireCMS infers `Record<string, CMSType>` and the property no longer matches the collection's type.

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
