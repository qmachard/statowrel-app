import type { ConfigContext, ExpoConfig } from 'expo/config';

type Variant = 'development' | 'preview' | 'production';

const APP_VARIANT = (process.env.APP_VARIANT as Variant | undefined) ?? 'development';

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
      backgroundColor: '#FFFFFF',
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
