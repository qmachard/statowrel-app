# Firebase service files

React Native Firebase configures the default Firebase app **natively, at
launch**, off the two files below. They are read by `app.config.ts` at
build time and baked into the binary — nothing in the JS bundle can
configure Firebase any more, so **changing project takes a build**.

```
google-services.development.json        Android · fr.quentinmachard.statowrel.dev
google-services.production.json         Android · fr.quentinmachard.statowrel
GoogleService-Info.development.plist    iOS     · fr.quentinmachard.statowrel.dev
GoogleService-Info.production.plist     iOS     · fr.quentinmachard.statowrel
```

Two configurations, not three: `preview` and `production` share a bundle
identifier, so they share a Firebase app — the same pairing `app.config.ts`
makes for the OAuth clients and the Sign in with Apple capability.

## Where to get them

Firebase console → Project settings → Your apps. One Android app and one
iOS app **per bundle identifier**; download `google-services.json` and
`GoogleService-Info.plist` from each, and rename them as above.

The `.dev` pair belongs to its own registered apps, not to the production
ones renamed: a service file carries the identifier it was minted for, and
the native SDK refuses a mismatch at launch.

## Why they are gitignored

Not because they are secret — a Firebase client config is public — but for
the same reason `.env.local` is: they name *which* project a checkout talks
to, and that is a per-developer, per-environment choice. A contributor
pointing a build at their own Firebase project must not have to fight the
repo for it.

## Builds

EAS never sees a gitignored file, so an EAS build reads them from **file**
environment variables instead:

```bash
eas env:create --environment development --type file --name GOOGLE_SERVICES_JSON  --value ./firebase/google-services.development.json
eas env:create --environment development --type file --name GOOGLE_SERVICES_PLIST --value ./firebase/GoogleService-Info.development.plist
# … same for the preview and production environments, with the production pair.
```

`app.config.ts` prefers those variables and falls back to the local files,
so `expo prebuild` and a local `run:ios` work off the checkout alone.
