import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import type { ConfigContext, ExpoConfig } from 'expo/config';

type Variant = 'development' | 'preview' | 'production';

/**
 * The yellow the native chrome is painted with — `colors.primary` of
 * `src/design/tokens.ts`, written out rather than imported: the Expo CLI reads
 * this file on its own, outside Metro, and gets no further than the config
 * module itself, where an import of the token file fails to resolve.
 *
 * It is the yellow `assets/icon.png` is drawn on, which is what makes it the
 * right one twice over: under Android's icon layers, where it carries on where
 * the foreground art stops, and behind the launch screen, whose star is cut out
 * of its own background so this shows through.
 */
const BRAND_YELLOW = '#ffdc59';

type VariantConfig = {
  name: string;
  iosBundleIdentifier: string;
  androidPackage: string;
  /**
   * The Firebase app the variant talks to, as the *native* SDKs read it.
   *
   * React Native Firebase is configured at launch by the native SDK off these
   * two files, never by the JS bundle — which is why they are named per variant
   * here rather than assembled from `EXPO_PUBLIC_FIREBASE_*` at runtime. A
   * Firebase app is registered against one bundle identifier, so the pairing
   * below is the same one the identifiers make: `development` has its own,
   * `preview` and `production` share theirs because they share an identifier.
   *
   * The files are gitignored (they carry the project's own identifiers, and
   * they differ per developer's Firebase project) — see apps/app/firebase/README.md.
   */
  firebaseSuffix: string;
};

const VARIANT_CONFIG: Record<Variant, VariantConfig> = {
  development: {
    name: 'StatOwrel (Dev)',
    iosBundleIdentifier: 'fr.quentinmachard.statowrel.dev',
    androidPackage: 'fr.quentinmachard.statowrel.dev',
    firebaseSuffix: 'development',
  },
  /*
   * Preview shares production's identity on purpose, and it is the only
   * variant that shares anything.
   *
   * A Google OAuth iOS client and a Sign in with Apple capability are both
   * bound to a bundle identifier, so a `.preview` suffix of its own would mean
   * a third OAuth client and a third App ID to keep in step with the other two
   * — for a variant whose entire job is to be what production will be. Taking
   * production's identifier makes it inherit both, and makes a preview build
   * exercise the very credentials the store build will sign against.
   *
   * The cost is that preview and production cannot sit side by side on a
   * device: installing one replaces the other. The app name still tells them
   * apart once installed, and `development` keeps its own suffix, so the
   * everyday pair (dev + one of the two) still coexists.
   */
  preview: {
    name: 'StatOwrel (Preview)',
    iosBundleIdentifier: 'fr.quentinmachard.statowrel',
    androidPackage: 'fr.quentinmachard.statowrel',
    firebaseSuffix: 'production',
  },
  production: {
    name: 'StatOwrel',
    iosBundleIdentifier: 'fr.quentinmachard.statowrel',
    androidPackage: 'fr.quentinmachard.statowrel',
    firebaseSuffix: 'production',
  },
};

/**
 * The variant is **required**, never defaulted.
 *
 * It used to fall back to `development` when `APP_VARIANT` was missing, which
 * is the one failure this config can have that produces no error at all: a
 * `--profile production` build would go green from end to end and ship
 * `fr.quentinmachard.statowrel.dev`, indistinguishable from a dev build except
 * by reading the bundle identifier back off the artefact.
 *
 * The value comes from the build profile's `env` block in `eas.json` on a
 * build — EAS applies it both on the worker and when the CLI evaluates this
 * file locally to resolve credentials — and from the npm script itself for
 * anything run by hand (`dev`, `prebuild`, `submit:*` in `package.json`).
 * Outside those, pass it explicitly: `APP_VARIANT=production npx expo config`.
 */
const resolveVariant = (): Variant => {
  const value = process.env.APP_VARIANT;

  if (value && value in VARIANT_CONFIG) {
    return value as Variant;
  }

  throw new Error(
    `[app.config] APP_VARIANT is ${value ? `"${value}"` : 'not set'}, expected one of ` +
      `${Object.keys(VARIANT_CONFIG).join(' | ')}. An EAS build reads it from the profile's ` +
      `\`env\` block in eas.json; anything else has to pass it (APP_VARIANT=development …).`,
  );
};

const variantName = resolveVariant();

const variant = VARIANT_CONFIG[variantName];

/**
 * Whether this build is the one that talks to the **emulator suite**, and
 * therefore the one — and the only one — allowed to speak plain HTTP.
 *
 * `npm run dev:functions` serves Auth, Firestore and Functions over `http://`
 * on the LAN, and both platforms refuse cleartext by default: iOS through App
 * Transport Security, Android through `usesCleartextTraffic`. Firestore slips
 * past on iOS because its emulator connection is gRPC on its own socket, which
 * is precisely what makes the wall so confusing when it finally shows up — the
 * app reads and writes happily, and the first callable dies with « the resource
 * could not be loaded because the App Transport Security policy requires the
 * use of a secure connection », a message naming neither the emulator nor the
 * host it could not reach.
 *
 * Scoped to `development` on purpose: `preview` and `production` keep the
 * platform defaults, so the binary a reviewer sees carries no cleartext
 * exception at all. And since both knobs are native, turning them on takes a
 * **new dev client** — never a Metro restart.
 */
const isDevelopment = variantName === 'development';

/**
 * Reversed Google OAuth iOS client id (`com.googleusercontent.apps.…`), taken
 * from the iOS OAuth client in the Firebase console. It has to be registered as
 * a URL scheme at build time, so it cannot be read at runtime like the other
 * `EXPO_PUBLIC_*` values — hence a config plugin rather than a plain env var.
 *
 * The plugin is added only when the scheme is set, so `expo start` still works
 * on a checkout without Google credentials (Google sign-in is then disabled at
 * runtime too — see `src/auth/providers.ts`).
 */
const googleIosUrlScheme = process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME;

if (!googleIosUrlScheme) {
  console.warn('[app.config] EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME is missing — Google sign-in will be unavailable on iOS.');
}

/**
 * Where the native Firebase config comes from, and it is the whole reason this
 * app no longer reads `EXPO_PUBLIC_FIREBASE_*`.
 *
 * React Native Firebase initialises the default app **natively, at launch**,
 * off `google-services.json` (Android) and `GoogleService-Info.plist` (iOS).
 * Both are baked into the binary at build time, which puts them on the same
 * footing as the Google OAuth URL scheme above: changing the Firebase project
 * takes a build, never a Metro restart and never an OTA update.
 *
 * Two sources, in this order:
 *
 * 1. `GOOGLE_SERVICES_JSON` / `GOOGLE_SERVICES_PLIST` — EAS **file** environment
 *    variables (`eas env:create --type file`), which the builder materialises as
 *    a path. This is what a build reads: the checked-in files are gitignored, and
 *    EAS excludes gitignored files from the upload, so nothing else can reach the
 *    worker.
 * 2. `./firebase/<file>.<variant>` — the local copy, for `expo prebuild` and a
 *    local `run:ios` / `run:android`.
 *
 * A missing file is left as `undefined` rather than pointed at a path that does
 * not exist: Expo's own error for the second is a stat failure on a filename,
 * while `src/lib/firebase.ts` catches the first at launch and says what to do.
 */
const googleServicesFile = (envVar: string, localPath: string): string | undefined => (
  process.env[envVar] || (existsSync(resolve(__dirname, localPath)) ? localPath : undefined)
);

const androidGoogleServicesFile = googleServicesFile(
  'GOOGLE_SERVICES_JSON',
  `./firebase/google-services.${variant.firebaseSuffix}.json`,
);

const iosGoogleServicesFile = googleServicesFile(
  'GOOGLE_SERVICES_PLIST',
  `./firebase/GoogleService-Info.${variant.firebaseSuffix}.plist`,
);

if (!androidGoogleServicesFile || !iosGoogleServicesFile) {
  console.warn(
    '[app.config] No Firebase service file for the ' +
      `"${variant.firebaseSuffix}" configuration — a build from this config cannot reach Firebase at all. ` +
      'See apps/app/firebase/README.md.',
  );
}

const plugins: NonNullable<ExpoConfig['plugins']> = [
  [
    /*
     * React Native Firebase's own plugin: it is what copies the two service
     * files into the native projects and wires the Firebase SDKs into the
     * build. Auth carries a second one, which adds the iOS pieces the native
     * Auth SDK needs. Firestore and Functions have no plugin of their own —
     * their pods are pulled in by autolinking off the packages alone.
     *
     * **`disableSPM` is the whole reason this entry is a tuple**, and it is not
     * a preference. On React Native 0.75+ RNFB resolves the Firebase Apple SDK
     * through Swift Package Manager by default, which requires dynamic
     * framework linkage. That combination builds — right up to the final link,
     * where it fails with `ld: symbol(s) not found for architecture arm64`.
     *
     * The cause is in this app's pod graph, not in Firebase.
     * `@react-native-google-signin/google-signin` pulls the `GoogleSignIn` pod,
     * and with it GoogleUtilities, GTMSessionFetcher and PromisesObjC **through
     * CocoaPods** — the very libraries Firebase brings through SPM. The build
     * log shows both sets being compiled side by side. RNFB's own docs name
     * this: mixing its SPM mode with a pod that resolves the same Google
     * libraries via CocoaPods is dual resolution, and it does not produce one
     * shared runtime.
     *
     * So Firebase is resolved through CocoaPods too, and every Google library
     * in the binary comes from one graph. Which in turn is what allows — and
     * requires — the static linkage below.
     */
    '@react-native-firebase/app',
    {
      ios: {
        disableSPM: true,
      },
    },
  ],
  '@react-native-firebase/auth',
  [
    'expo-build-properties',
    {
      ios: {
        /*
         * Static, and only because SPM is off above: `useFrameworks: 'static'`
         * with RNFB's SPM mode is explicitly unsupported — the Firebase Swift
         * Package ships dynamic products only, so each RNFB pod would embed its
         * own copy and the link would fail on duplicate symbols instead.
         *
         * `forceStaticLinking` names the RNFB pods that must stay static under
         * the `use_frameworks!` this sets. One line per Firebase module the app
         * installs: adding a `@react-native-firebase/*` package means adding
         * its pod here.
         */
        useFrameworks: 'static',
        forceStaticLinking: [ 'RNFBApp', 'RNFBAuth', 'RNFBFirestore', 'RNFBFunctions', 'RNFBAnalytics' ],
      },
      android: {
        // Android's half of the same exception — see `isDevelopment`. Cleartext
        // has been off by default since API 28, so a release-flavoured dev build
        // hits the identical wall the iOS one does, one platform later.
        usesCleartextTraffic: isDevelopment,
      },
    },
  ],
  'expo-apple-authentication',
  [
    /*
     * The daily question's way in (docs/prd.md §4.2). The plugin is what adds
     * the push entitlement on iOS and the `POST_NOTIFICATIONS` permission on
     * Android, so a build without it takes the token and never shows a banner.
     *
     * `color` tints the Android status-bar icon and the notification's accent.
     * The icon itself is left to Expo's default — a monochrome silhouette of
     * the star, which Android needs and `assets/` has yet to carry, is the one
     * thing still missing here.
     */
    'expo-notifications',
    {
      color: BRAND_YELLOW,
    },
  ],
  [
    'expo-splash-screen',
    {
      /*
       * The launch screen: the star of `assets/splash-icon.png`, cut out, on the
       * brand yellow.
       *
       * The star takes a bit under half of its square, so these widths size the
       * *square*, not the star — it comes out around 147pt on iOS and 132dp on
       * Android. 288 is a ceiling there rather than a choice: Android composes
       * the splash icon into a canvas of its own and masks it to a circle, and
       * the star is framed to fill that circle at exactly this width.
       */
      backgroundColor: BRAND_YELLOW,
      image: './assets/splash-icon.png',
      imageWidth: 320,
      android: {
        imageWidth: 288,
      },
    },
  ],
];

if (googleIosUrlScheme) {
  plugins.push([ '@react-native-google-signin/google-signin', { iosUrlScheme: googleIosUrlScheme } ]);
}

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: variant.name,
  slug: 'statowrel-app',
  owner: 'qmachard',
  scheme: 'statowrel',
  version: '1.2.0',
  /*
   * Portrait, and nothing else — no screen here has a layout that turns.
   *
   * On Android this is the whole lock: Expo's plugin writes
   * `android:screenOrientation="portrait"` onto the main activity. On iOS it
   * only writes the universal `UISupportedInterfaceOrientations` key — the
   * `~ipad` variant is written by the `requireFullScreen` plugin instead, which
   * is why `supportsTablet` below is what actually settles the lock there.
   */
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  icon: './assets/icon.png',
  ios: {
    ...config.ios,
    bundleIdentifier: variant.iosBundleIdentifier,
    googleServicesFile: iosGoogleServicesFile,
    /*
     * iPhone only (device family `[1]`), and that is what makes the portrait
     * lock above hold on iOS.
     *
     * iPad multitasking requires all four orientations — ITMS-90474 rejects the
     * bundle without them — so Expo injects them into
     * `UISupportedInterfaceOrientations~ipad` itself as soon as this is true and
     * `requireFullScreen` is not. The build was therefore declaring portrait on
     * iPhone and everything on iPad. `requireFullScreen: true` would stop that
     * injection, but Apple has deprecated it: as of iOS 27 it no longer opts an
     * app out of resizing.
     *
     * Dropping the iPad is the only lock that holds, and it costs nothing here:
     * no screen is drawn for a tablet, and docs/store-listing.md §3.2 plans
     * iPhone screenshots alone — which App Store Connect only accepts while the
     * binary does not claim the iPad.
     */
    supportsTablet: false,
    // Required capability for expo-apple-authentication (docs/prd.md §4.1 —
    // Apple sign-in is mandatory on iOS once another social provider is offered).
    usesAppleSignIn: true,
    infoPlist: {
      ...config.ios?.infoPlist,
      ITSAppUsesNonExemptEncryption: false,
      // Cleartext to the emulator suite, development builds only — see
      // `isDevelopment`. `NSAllowsLocalNetworking` is the targeted key and
      // covers the LAN address a phone reaches the Mac on; `NSAllowsArbitraryLoads`
      // sits beside it because ATS's own rules for what counts as "local" are
      // narrower than they read, and a dev client that cannot reach its backend
      // is worth less than a dev client with a broad exception it never ships.
      ...(isDevelopment
        ? { NSAppTransportSecurity: { NSAllowsLocalNetworking: true, NSAllowsArbitraryLoads: true } }
        : {}),
    },
  },
  android: {
    ...config.android,
    package: variant.androidPackage,
    googleServicesFile: androidGoogleServicesFile,
    adaptiveIcon: {
      // The star alone, on its own layer, over the yellow `icon.png` is drawn
      // on: a launcher masks the two together and moves them apart on a press,
      // which is why the background is a flat colour rather than part of the art.
      // The art is framed so the star clears that mask — the trail is what runs
      // past it, as it runs past the edge of the icon.
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: BRAND_YELLOW,
    },
  },
  plugins,
  extra: {
    ...config.extra,
    eas: {
      projectId: 'f042ef39-34fb-4783-9013-04074ce87987',
    },
  },
});
