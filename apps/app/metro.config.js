const crypto = require('crypto');
const fs = require('fs');

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

// apps/firecms is pinned to firebase 10 (FireCMS v2's peer range), so npm hoists
// that tree's @firebase/app@0.10 to the repo root while firebase 12 keeps its own
// @firebase/app@0.16 nested under node_modules/firebase. @firebase/auth declares
// @firebase/app as a peer with the wide "0.x" range, so it dedupes onto the old
// root copy — `initializeApp()` then creates the app in one component container
// and auth registers itself in another, which surfaces at runtime as
// "Component auth has not been registered yet".
//
// Resolving every @firebase/* request from firebase 12's own tree keeps the whole
// SDK on a single copy. Only this Metro bundle is affected: apps/firecms builds
// with Vite and keeps its firebase 10.
const firebaseOrigin = require.resolve('firebase/package.json');

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const origin = moduleName.startsWith('@firebase/')
    ? { ...context, originModulePath: firebaseOrigin }
    : context;

  return context.resolveRequest(origin, moduleName, platform);
};

// Metro's cache key covers the serialisable parts of this config, but not a
// `resolveRequest` function — so editing the resolver above would otherwise keep
// serving a graph resolved by the previous one, and only `expo start -c` would
// pick the change up. Keying the cache on this file's contents makes any change
// here invalidate the cache on its own.
config.cacheVersion = crypto.createHash('sha1').update(fs.readFileSync(__filename)).digest('hex').slice(0, 12);

module.exports = withNativeWind(config, { input: './global.css' });
