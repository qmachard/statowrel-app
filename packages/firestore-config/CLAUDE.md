# Firestore config (`@statowrel/firestore-config`)

Firestore security rules, Firestore indexes, and Storage security rules. No application code — this package is only deployed via the Firebase CLI.

- `firestore.rules` — Firestore security rules. Deployed with `npm run deploy:firestore` (root script, uses the `default` Firebase project) or `npm run deploy:firestore:production`.
- `firestore.indexes.json` — composite indexes **and** single-field overrides. Keep in sync with any query added to `apps/app` or `apps/functions` that Firestore rejects for lacking an index — copy the index definition Firestore's error message links to rather than hand-writing it.

  **A collection-group query needs its index declared even on one field.** Firestore indexes every field automatically, but only at `COLLECTION` scope: an equality across a collection group — `user_id ==` over `v1_daily_question_answers`, which `users-deleteAccount` runs to find one account's answers wherever they sit — fails with `FAILED_PRECONDITION` until a `fieldOverrides` entry grants it `COLLECTION_GROUP` scope. A composite index starting on the same field does *not* stand in for it. An override **replaces** the automatic configuration for that field, so its entry re-declares the three `COLLECTION`-scope defaults (ascending, descending, array-contains) alongside the one being added — listing only the new one would silently drop them.
- `storage.rules` — Storage security rules, default-deny. Every collection/path gets an explicit rule as it's introduced; nothing is world-readable or world-writable by default.

## Conventions

- Every collection rule mirrors its `v1_` prefix in `@statowrel/models`.
- Admins (via a custom `admin` auth claim) bypass all rules — see the top-level `isAdmin()` wildcard match in `firestore.rules`. App-facing rules only need to describe what an authenticated end user may do.
- New collections always get an explicit `match` block; never widen the top-level wildcard.
