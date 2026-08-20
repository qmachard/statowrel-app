import type { ConfigContext, ExpoConfig } from 'expo/config';

type Variant = 'development' | 'preview' | 'production';

const APP_VARIANT = (process.env.APP_VARIANT as Variant | undefined) ?? 'development';

/**
 * The two colours the native chrome is painted with, written out rather than
 * imported from `src/design/tokens.ts`: the Expo CLI reads this file on its own,
 * outside Metro, and gets no further than the config module itself — an import
 * of the token file fails to resolve there.
 *
 * Each one belongs to the asset it stands behind, and moves with it.
 * `ICON_BACKGROUND` is `colors.primary`, the yellow `assets/icon.png` is drawn
 * on, so Android's second icon layer carries on where the art stops.
 * `SPLASH_BACKGROUND` is the white of `assets/splash-icon.png`, which is an
 * opaque square: anything else here would frame it.
 */
const ICON_BACKGROUND = '#ffdc59';
const SPLASH_BACKGROUND = '#ffffff';

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
       * The launch screen: the star of `assets/splash-icon.png` on the white it
       * is drawn on. The art keeps three quarters of its square empty, so the
       * width below is the *square's*, not the star's — the star itself lands
       * at a bit under a third of it.
       *
       * Android composes the icon into a canvas of its own and masks it to a
       * circle, which caps that width at 288; iOS gets a size that still fits
       * across the narrowest phone.
       */
      backgroundColor: SPLASH_BACKGROUND,
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
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: ICON_BACKGROUND,
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
