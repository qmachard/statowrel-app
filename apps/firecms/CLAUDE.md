# FireCMS (`@statowrel/firecms`)

Backoffice for StatOwrel. React 18 + Vite (SPA) + FireCMS v2 + MUI. Deployed to Firebase Hosting.

## Structure

- `src/firebase-config.ts` — reads `VITE_FIREBASE_*` env vars, passed to `<FirebaseCMSApp firebaseConfig={...} />`.
- `src/authenticator/admin.ts` — gate: only allows sign-in for allow-listed admin emails (`Authenticator<FirebaseUser>`).
- `src/collections/index.ts` — the list of `EntityCollection` definitions rendered as the CMS's left nav.
- `src/collections/questions.ts` — the `v1_questions` collection; the reference to copy when adding a new one.
- `src/collections/fields/` — custom form fields, one file per component.
- `src/App.tsx` — mounts `<FirebaseCMSApp />`, wires the Firestore/Auth emulators when `VITE_FIREBASE_*_EMULATOR_HOST` env vars are set.

## Adding a collection

One file per `v1_*` Firestore collection under `src/collections/`, following FireCMS's `buildCollection<T>()` API, using the `*_COLLECTION` constant from `@statowrel/models`. Import and add it to the array in `src/collections/index.ts`.

Two gotchas, both visible in `questions.ts`:

- **Do not type the collection with the model's `*Data` type directly.** FireCMS reads Firestore with its own data source (`Timestamp` → `Date`), not with the model's converter (`Timestamp` → ISO `string`). Declare a local type that overrides the timestamp fields with `Date`.
- **A map with dynamic keys needs a custom `Field`.** FireCMS only types a map's sub-properties when the keys are known up front. Write the editor as a `FieldProps<T>` component (see `fields/QuestionOptionsField.tsx`) and pass it as `Field:` — a custom `Field` takes precedence over the built-in binding. Keep `keyValue: true` on the property so the collection table still previews the map, and give `buildProperty` an explicit generic (`buildProperty<Record<string, XData>>({ ... })`) — without it, FireCMS infers `Record<string, CMSType>` and the property no longer matches the collection's type.
- **Invariants the backoffice must respect go in `callbacks.onPreSave`**, throwing an `Error` with the message to show. Firestore rules do not catch them: the backoffice writes as an admin, and the wildcard `isAdmin()` rule accepts anything.

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
