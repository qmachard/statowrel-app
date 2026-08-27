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

## Android SHA-1

**A `google-services.json` alone does not make Google sign-in work on Android.**
Play services resolves the Android OAuth client from the package name *plus the
SHA-1 of the certificate the installed binary is signed with*, and refuses the
sign-in — `DEVELOPER_ERROR`, after showing the account picker — when no
registered fingerprint matches. iOS never hits this: it resolves through the
`iosClientId` and URL scheme that `eas.json` carries.

Every fingerprint an install can present has to be registered on the matching
Android app in the Firebase console (Project settings → Your apps → *Add
fingerprint*). There are **two per identifier**, and registering one and not the
other is what produces a Google sign-in that works on a preview build and fails
once the app comes from the store:

| Fingerprint | Where it comes from | Which install presents it |
|---|---|---|
| EAS upload key | `APP_VARIANT=production eas credentials` → Android → Keystore | An APK/AAB installed by hand from the EAS dashboard |
| Play app signing key | Play Console → Test and release → **App integrity** → App signing key certificate | Anything installed from Play, internal testing included |

Play App Signing is the whole subtlety: Google **re-signs** the uploaded AAB with
its own key, so the store build presents a fingerprint the upload key never had.

`fr.quentinmachard.statowrel.dev` is a separate Firebase app with its own
fingerprint list — a `development` build needs its own EAS keystore SHA-1 there.

After adding a fingerprint:

```bash
# 1. Re-download google-services.json from the console, over the local copy.
# 2. Re-push it to EAS — the file variable holds a snapshot, not a link.
APP_VARIANT=production eas env:set \
  --environment preview --environment production \
  --name GOOGLE_SERVICES_JSON --type file --visibility secret \
  --value ./firebase/google-services.production.json

# 3. Rebuild. The fingerprint is checked against the binary, so nothing short
#    of a new build picks it up — and no OTA update can.

# Checks the app config against the Firebase/Google Cloud one before you burn a build:
npx @react-native-google-signin/config-doctor
```

## Builds

EAS never sees a gitignored file, so an EAS build reads them from **file**
environment variables instead. Run these from `apps/app`, once the files are
in place — `--value` is a path, resolved against the working directory:

```bash
# The development pair.
APP_VARIANT=development eas env:set development \
  --name GOOGLE_SERVICES_JSON  --type file --visibility secret \
  --value ./firebase/google-services.development.json

APP_VARIANT=development eas env:set development \
  --name GOOGLE_SERVICES_PLIST --type file --visibility secret \
  --value ./firebase/GoogleService-Info.development.plist

# The production pair, in both environments at once: `preview` and `production`
# share a bundle identifier, so they share the Firebase app.
APP_VARIANT=production eas env:set \
  --environment preview --environment production \
  --name GOOGLE_SERVICES_JSON  --type file --visibility secret \
  --value ./firebase/google-services.production.json

APP_VARIANT=production eas env:set \
  --environment preview --environment production \
  --name GOOGLE_SERVICES_PLIST --type file --visibility secret \
  --value ./firebase/GoogleService-Info.production.plist
```

**`APP_VARIANT` is not optional, and its absence does not look like its
absence.** Every `eas` command evaluates `app.config.ts` to resolve the
project, and that file throws rather than defaulting the variant (see its own
comment — a silent default once shipped a `.dev` bundle identifier through a
`--profile production` build). EAS swallows the message and reports only
`expo/bin/cli config --json exited with non-zero code: 1`, which names nothing.
A build is the one case that needs no prefix: `eas.json` sets `APP_VARIANT` in
each profile's `env` block. Everything else — `env:set`, `env:list`, `config`,
`credentials` — has no profile to read, so it has to be passed by hand.

`env:create` was the older spelling of `env:set` and is deprecated; the value
it carries is the same.

**That same `exited with non-zero code: 1` also means « run `npm install` ».**
Evaluating the config resolves the config plugins, and this branch added three
of them (`@react-native-firebase/app`, `@react-native-firebase/auth`,
`expo-build-properties`), so a checkout switched to it without reinstalling
fails on the first one — `PluginError: Failed to resolve plugin for module …`,
which EAS reports as the same bare exit code as everything else.

When an `eas` command dies on that line, run the underlying command directly to
see what it actually said:

```bash
cd apps/app && APP_VARIANT=development npx expo config --json
```

`app.config.ts` prefers these variables and falls back to the local files, so
`expo prebuild` and a local `run:ios` work off the checkout alone.

## Checking what landed

```bash
APP_VARIANT=production eas env:list --environment production
```

A `secret` file variable is write-only from the outside: the listing shows the
name and the type, never the contents. That is the trade for `--visibility
secret` — use `sensitive` instead if you would rather be able to read it back,
at the cost of it being visible to anyone with dashboard access.
