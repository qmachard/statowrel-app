/**
 * The one place the app's own web address is written down.
 *
 * It is not a preference: the same host is baked into `ios.associatedDomains`
 * and the Android intent filter of `app.config.ts`, into the
 * `apple-app-site-association` and `assetlinks.json` that Firebase Hosting
 * serves, and into every referral link already sent to somebody. Moving it
 * costs a native rebuild **and** a re-verification on both platforms, so it is
 * a constant rather than a value read from the environment — and one constant
 * rather than the four literals it used to be.
 *
 * Written out rather than derived from the Firebase config for the same reason
 * the legal URLs always were: the site is public and the same for every build,
 * where `EXPO_PUBLIC_FIREBASE_*` swings with the variant.
 *
 * `app.config.ts` still carries its own copy — the Expo CLI reads that file
 * outside Metro and gets no further than the config module itself, where an
 * import of anything under `src/` fails to resolve, exactly as `BRAND_YELLOW`
 * already documents.
 */
export const SITE_ORIGIN = 'https://statowrel-app.web.app';
