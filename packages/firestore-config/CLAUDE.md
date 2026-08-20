# Firestore config (`@statowrel/firestore-config`)

Firestore security rules, Firestore indexes, and Storage security rules. No application code — this package is only deployed via the Firebase CLI.

- `firestore.rules` — Firestore security rules. Deployed with `npm run deploy:firestore` (root script, uses the `default` Firebase project) or `npm run deploy:firestore:production`.
- `firestore.indexes.json` — composite indexes. Keep in sync with any query added to `apps/app` or `apps/functions` that Firestore rejects for lacking an index — copy the index definition Firestore's error message links to rather than hand-writing it.
- `storage.rules` — Storage security rules, default-deny. Every collection/path gets an explicit rule as it's introduced; nothing is world-readable or world-writable by default.

## Conventions

- Every collection rule mirrors its `v1_` prefix in `@statowrel/models`.
- Admins (via a custom `admin` auth claim) bypass all rules — see the top-level `isAdmin()` wildcard match in `firestore.rules`. App-facing rules only need to describe what an authenticated end user may do.
- New collections always get an explicit `match` block; never widen the top-level wildcard.
