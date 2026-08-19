# FireCMS (`@statowrel/firecms`)

Backoffice for StatOwrel. React 18 + Vite (SPA) + FireCMS v2 + MUI. Deployed to Firebase Hosting.

## Structure

- `src/firebase-config.ts` — reads `VITE_FIREBASE_*` env vars, passed to `<FirebaseCMSApp firebaseConfig={...} />`.
- `src/authenticator/admin.ts` — gate: only allows sign-in for allow-listed admin emails (`Authenticator<FirebaseUser>`).
- `src/collections/index.ts` — the `EntityCollectionsBuilder` returning the `EntityCollection` definitions rendered as the CMS's left nav. It receives the logged-in `user`, so a collection can depend on who is connected.
- `src/collections/v1_questions.ts` — the `v1_questions` collection; the reference to copy when adding a new one.
- `src/collections/v1_users.ts` — the `v1_users` collection; the exception to the ULID rule, its document id is the Firebase Auth UID.
- `src/collections/v1_daily_questions.ts` — the `v1_daily_questions` collection; the other exception to the ULID rule, its document id follows the `date` field.
- `src/collections/v1_daily_question_answers.ts` — the read-only `v1_daily_question_answers` sub-collection, wired into the one above via `subcollections`. A sub-collection gets its own file like any other.
- `src/collections/v1_daily_question_months.ts` and `src/collections/v1_user_calendar_months.ts` — the calendar's two monthly read models, both read-only. They are projections of the answers, not sources of truth: editing one would make the app's calendar disagree with the data it is derived from without touching a single answer, so they are there to be inspected, not changed.
- `src/collections/entityId.ts` — `ulidEntityId`, the `onIdUpdate` callback a collection wires in so its document ids are ULIDs.
- `src/App.tsx` — mounts `<FirebaseCMSApp />`, wires the Firestore/Auth emulators when `VITE_FIREBASE_*_EMULATOR_HOST` env vars are set.

## Adding a collection

One file per `v1_*` Firestore collection under `src/collections/`, **named after the collection** (`v1_questions.ts`, not `questions.ts`) — unlike the models, which take the singular. Follow FireCMS's `buildCollection<T>()` API, using the `*_COLLECTION` constant from `@statowrel/models`. Export the collection directly (`v1_users.ts`), or a builder taking the logged-in `user` (`buildQuestionsCollection(user)`) when the definition depends on who is connected, then register it in the array returned by `src/collections/index.ts`.

Two gotchas, both visible in `v1_questions.ts`:

- **Do not type the collection with the model's `*Data` type directly.** FireCMS reads Firestore with its own data source (`Timestamp` → `Date`), not with the model's converter (`Timestamp` → ISO `string`). Declare a local type that overrides the timestamp fields with `Date`.
- **Document ids are ULIDs**, unless the collection is keyed by something else — `v1_users` is keyed by the Firebase Auth UID and therefore wires no `onIdUpdate` at all. Otherwise set `callbacks.onIdUpdate: ulidEntityId`. FireCMS pre-fills a Firestore auto-id for a new entity and re-runs `onIdUpdate` on every form change; the helper swaps that auto-id for a ULID once, then returns it unchanged — a callback that regenerated on each keystroke would move the document being written.
- **Invariants the backoffice must respect go in `callbacks.onPreSave`**, throwing an `Error` with the message to show. Firestore rules do not catch them: the backoffice writes as an admin, and the wildcard `isAdmin()` rule accepts anything. It is also where derived values are filled in — `v1_questions` mints the ULID of any option that doesn't have one yet.

A list of sub-objects is a plain `dataType: 'array'` of `dataType: 'map'`, which gives drag-to-reorder, add and delete for free. Reach for a custom `Field` component only when the built-in bindings genuinely can't express the shape — a map with dynamic keys, for instance, which FireCMS can only type when the keys are known up front. `v1_daily_questions.answer_counts` is that case, keyed by option ULIDs: a `keyValue: true` map covers it, at the cost of widening the value type to `CMSType` in the collection's local entity type.

## Local development

```bash
cp apps/firecms/.env.example apps/firecms/.env.local   # fill in Firebase web app config
npm run dev            # Vite dev server on :3002
npm run dev:firecms    # same, run from the repo root via turbo
```

Point `VITE_FIREBASE_*_EMULATOR_HOST`/`_PORT` env vars at the Functions emulator suite (`apps/functions`) to develop against local data — `localhost:8080` for Firestore, `localhost:9099` for Auth (ports from `firebase.json`).

## Validation

Always run before considering a change complete:

```bash
npm run typecheck
npm run lint
```
