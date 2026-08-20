import type { ConfigContext, ExpoConfig } from 'expo/config';

type Variant = 'development' | 'preview' | 'production';

const APP_VARIANT = (process.env.APP_VARIANT as Variant | undefined) ?? 'development';

/**
 * `colors.background` of `src/design/tokens.ts`, written out rather than
 * imported: the Expo CLI reads this file on its own, outside Metro, and gets no
 * further than the config module itself — an import of the token file fails to
 * resolve there. Keep the two in step by hand; it is the colour the launch
 * screen stands on, native side and JS side alike.
 */
const BACKGROUND = '#f7f0d4';

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
       * The native half of the launch screen — `src/splash/Splash.tsx` is the
       * other half, and the two are built to be indistinguishable: same
       * background, same star, at the same size and in the same frame.
       *
       * `splash-icon.png` is the star of `assets/lottie/star.json` held still,
       * in that composition's own square canvas, and 256 is the side the
       * animated one takes on screen (`Animation`'s `3xl` step). The animation
       * opens on the star already in place, so what the handover shows is the
       * still star becoming the moving one, rather than a launch screen
       * replacing another.
       */
      backgroundColor: BACKGROUND,
      image: './assets/splash-icon.png',
      imageWidth: 256,
      android: {
        // Android draws the splash icon inside a circle it masks itself, so the
        // star is stepped down to fit in it and grows into place when the
        // animated splash takes over.
        imageWidth: 192,
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
      // The mark alone, on its own layer: a launcher masks the two together and
      // moves them apart on a press, so the background is a flat colour here.
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: BACKGROUND,
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
