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

const VARIANT_CONFIG: Record<Variant, { name: string; iosBundleIdentifier: string; androidPackage: string }> = {
  development: {
    name: 'StatOwrel (Dev)',
    iosBundleIdentifier: 'fr.quentinmachard.statowrel.dev',
    androidPackage: 'fr.quentinmachard.statowrel.dev',
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
  },
  production: {
    name: 'StatOwrel',
    iosBundleIdentifier: 'fr.quentinmachard.statowrel',
    androidPackage: 'fr.quentinmachard.statowrel',
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

const variant = VARIANT_CONFIG[resolveVariant()];

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

const plugins: NonNullable<ExpoConfig['plugins']> = [
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
  version: '1.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  icon: './assets/icon.png',
  ios: {
    ...config.ios,
    bundleIdentifier: variant.iosBundleIdentifier,
    supportsTablet: true,
    // Required capability for expo-apple-authentication (docs/prd.md §4.1 —
    // Apple sign-in is mandatory on iOS once another social provider is offered).
    usesAppleSignIn: true,
    infoPlist: {
      ...config.ios?.infoPlist,
      ITSAppUsesNonExemptEncryption: false
    },
  },
  android: {
    ...config.android,
    package: variant.androidPackage,
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
