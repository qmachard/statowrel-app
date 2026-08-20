import type { ConfigContext, ExpoConfig } from 'expo/config';

type Variant = 'development' | 'preview' | 'production';

const APP_VARIANT = (process.env.APP_VARIANT as Variant | undefined) ?? 'development';

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
  preview: {
    name: 'StatOwrel (Preview)',
    iosBundleIdentifier: 'fr.quentinmachard.statowrel.preview',
    androidPackage: 'fr.quentinmachard.statowrel.preview',
  },
  production: {
    name: 'StatOwrel',
    iosBundleIdentifier: 'fr.quentinmachard.statowrel',
    androidPackage: 'fr.quentinmachard.statowrel',
  },
};

const variant = VARIANT_CONFIG[APP_VARIANT];

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
