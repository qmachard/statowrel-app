const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// The Firebase JS SDK's package.json "exports" map doesn't declare a
// "react-native" condition for every subpath (e.g. "firebase/auth"), so
// Metro's newer exports-aware resolver picks the browser build instead of
// the React Native one (breaking things like getReactNativePersistence).
// Fall back to legacy "main"/"react-native" field resolution, which Firebase
// does support correctly. See https://github.com/firebase/firebase-js-sdk/issues/8353
config.resolver.unstable_enablePackageExports = false;

module.exports = withNativeWind(config, { input: './global.css' });
