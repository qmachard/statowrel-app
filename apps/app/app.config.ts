import type { ConfigContext, ExpoConfig } from 'expo/config';

type Variant = 'development' | 'preview' | 'production';

const APP_VARIANT = (process.env.APP_VARIANT as Variant | undefined) ?? 'development';

const VARIANT_CONFIG: Record<Variant, { name: string; iosBundleIdentifier: string; androidPackage: string }> = {
  development: {
    name: 'StatOwrel (Dev)',
    iosBundleIdentifier: 'com.statowrel.app.dev',
    androidPackage: 'com.statowrel.app.dev',
  },
  preview: {
    name: 'StatOwrel (Preview)',
    iosBundleIdentifier: 'com.statowrel.app.preview',
    androidPackage: 'com.statowrel.app.preview',
  },
  production: {
    name: 'StatOwrel',
    iosBundleIdentifier: 'com.statowrel.app',
    androidPackage: 'com.statowrel.app',
  },
};

const variant = VARIANT_CONFIG[APP_VARIANT];

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: variant.name,
  slug: 'statowrel',
  scheme: 'statowrel',
  version: '1.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  ios: {
    ...config.ios,
    bundleIdentifier: variant.iosBundleIdentifier,
    supportsTablet: true,
  },
  android: {
    ...config.android,
    package: variant.androidPackage,
    adaptiveIcon: {
      backgroundColor: '#FFFFFF',
    },
  },
  plugins: [
    'expo-router',
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    ...config.extra,
    eas: {
      projectId: process.env.EAS_PROJECT_ID,
    },
  },
});
