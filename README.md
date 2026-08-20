# StatOwrel

Turborepo monorepo — mobile app (React Native + Expo + EAS) and backend (Firebase Cloud Functions).

See [`CLAUDE.md`](./CLAUDE.md) for conventions and [`docs/architecture.md`](./docs/architecture.md) for the architecture.

## Structure

- `apps/app` — mobile app (iOS + Android), React Native + Expo
- `apps/functions` — backend, Firebase Cloud Functions + Express
- `packages/models` — `@statowrel/models`, shared TypeScript models + Firestore converters
- `packages/firestore-config` — `@statowrel/firestore-config`, Firestore/Storage rules + indexes

## Getting started

```bash
npm install
```

```bash
npm run dev:app          # mobile app (Expo dev server)
npm run dev:functions    # backend (Firebase emulators + tsc --watch)
```

```bash
npm run typecheck
npm run lint
```

## Mobile builds (EAS)

```bash
npm run build:dev:ios
npm run build:dev:android
npm run build:preview:ios
npm run build:preview:android
npm run build:prod:ios
npm run build:prod:android
npm run submit:prod
```

Requires `eas login` and an EAS project linked via `eas init` from `apps/app`.

## Deploy

```bash
npm run deploy:functions
npm run deploy:firestore
```

Each has a `:production` variant that targets the `production` Firebase project (see `.firebaserc`).
