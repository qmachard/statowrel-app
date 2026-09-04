import type * as FirebaseAnalyticsModule from '@react-native-firebase/analytics';

/**
 * `@react-native-firebase/analytics` is a native module: importing it at module
 * scope throws on a binary built before it was added — a stale dev client, or a
 * checkout past the switch to Analytics that has not been rebuilt.
 *
 * Same lazy require as `src/notifications/helpers/nativeModule.ts` and
 * `src/auth/nativeModules.ts`, for the same reason: analytics is mounted at the
 * root of the app (`useAnalyticsIdentity`, `useScreenTracking`), so a throw
 * would take the whole launch down instead of one metric.
 *
 * Returns `null` on failure; the wrapper (`./analytics.ts`) then no-ops every
 * call. Nothing else in the app knows this module exists.
 */
export type AnalyticsModule = typeof FirebaseAnalyticsModule;

export type AnalyticsInstance = ReturnType<AnalyticsModule['getAnalytics']>;

export const loadAnalytics = (): AnalyticsModule | null => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-firebase/analytics') as AnalyticsModule;
  } catch {
    return null;
  }
};
