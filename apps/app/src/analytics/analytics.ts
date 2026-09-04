import { app } from '@/lib/firebase';

import type { AnalyticsEvent, AnalyticsUserProperties } from './events';
import { type AnalyticsInstance, loadAnalytics } from './nativeModule';

/**
 * The **only** file in the app that touches `@react-native-firebase/analytics`.
 *
 * Every screen calls `track`, `identify`, `setUserProperty`, `setScreen`,
 * `setEnabled` and nothing else — the SDK stays hidden behind this door so
 * that a switch to another provider (or to no provider at all) is one file to
 * change, not thirty.
 *
 * **Sending gate**: development builds never send unless
 * `EXPO_PUBLIC_ANALYTICS_FORCE_ENABLED === 'true'` — that is what keeps Metro
 * sessions from polluting DebugView with mock data. Consent (the CNIL question)
 * is not handled here yet: it will land later as its own layer around this
 * wrapper (a banner + a persisted flag), and the shape of that layer is what
 * decides whether it lives inside this file or beside it.
 *
 * The wrapper is a **noop** on a checkout without the native module and on any
 * error — nothing here may fail a screen.
 */

const FORCE_ENABLED = process.env.EXPO_PUBLIC_ANALYTICS_FORCE_ENABLED === 'true';
const isSendingAllowed = (): boolean => !__DEV__ || FORCE_ENABLED;

let cachedInstance: AnalyticsInstance | null = null;
let cacheLoaded = false;

const analyticsInstance = () => {
  if (cacheLoaded) {
    return cachedInstance;
  }

  cacheLoaded = true;

  const module = loadAnalytics();

  if (!module) {
    return null;
  }

  try {
    cachedInstance = module.getAnalytics(app);
  } catch (error: unknown) {
    console.warn('[analytics] could not resolve the analytics instance', error);
    cachedInstance = null;
  }

  return cachedInstance;
};

const safely = <T>(operation: string, run: () => T): T | undefined => {
  try {
    return run();
  } catch (error: unknown) {
    console.warn(`[analytics] ${operation} failed`, error);

    return undefined;
  }
};

/**
 * The Firebase Auth UID becomes GA4's User-ID. Passing `null` clears it
 * (sign-out), so events afterwards stay on the same device instance without
 * carrying the previous user's id.
 */
export const identify = (userId: string | null): void => {
  const analytics = analyticsInstance();
  const module = loadAnalytics();

  if (!analytics || !module) {
    return;
  }

  safely('identify', () => module.setUserId(analytics, userId));
};

export const setUserProperty = <K extends keyof AnalyticsUserProperties>(
  name: K,
  value: AnalyticsUserProperties[K] | null,
): void => {
  const analytics = analyticsInstance();
  const module = loadAnalytics();

  if (!analytics || !module) {
    return;
  }

  // GA4 user properties clear on `null` — pass it through so a caller can reset one.
  // Every property in `AnalyticsUserProperties` is already a string enum, but
  // the coercion here keeps the surface honest against a future numeric one.
  const stringValue = value === null || value === undefined ? null : String(value);

  safely('setUserProperty', () => module.setUserProperty(analytics, name, stringValue));
};

/**
 * Turns the SDK's own collection on or off. Kept in the wrapper's surface for
 * when the consent layer lands: whichever hook decides to flip it will call
 * this rather than reach into the SDK.
 */
export const setEnabled = (enabled: boolean): void => {
  const analytics = analyticsInstance();
  const module = loadAnalytics();

  if (!analytics || !module) {
    return;
  }

  safely('setEnabled', () => module.setAnalyticsCollectionEnabled(analytics, enabled));
};

/**
 * Types the event union at the call site — no untyped `track('foo', {…})` is
 * possible. Every event listed here maps 1:1 to a row in `docs/analytics.md`.
 */
export const track = <E extends AnalyticsEvent>(event: E): void => {
  if (!isSendingAllowed()) {
    return;
  }

  const analytics = analyticsInstance();
  const module = loadAnalytics();

  if (!analytics || !module) {
    return;
  }

  // The RN Firebase modular `logEvent` is typed with a huge overload set of
  // GA4-reserved event names — none of which we send — plus a generic
  // `CustomEventName<T>` branch. The two-step cast (`unknown` first) skirts
  // the overload set entirely: the caller side is still typed against
  // `AnalyticsEvent`, so nothing untyped reaches this line, but the SDK
  // signature does not have to be mimicked here.
  const logEvent = module.logEvent as unknown as (
    a: AnalyticsInstance,
    name: string,
    params?: Record<string, string | number | boolean | null | undefined>,
  ) => void;

  safely('track', () => logEvent(analytics, event.name, event.params));
};

/**
 * `screen_view` — the only free-form event, since screen names come from the
 * navigator (`RootStackParamList`) rather than from a fixed union. Rate-limited
 * to one call per distinct screen name in a row: React Navigation fires
 * `onStateChange` for a lot more than route transitions.
 */
let lastScreen: string | null = null;

export const setScreen = (name: string): void => {
  if (!isSendingAllowed() || name === lastScreen) {
    return;
  }

  lastScreen = name;

  const analytics = analyticsInstance();
  const module = loadAnalytics();

  if (!analytics || !module) {
    return;
  }

  safely('setScreen', () => module.logScreenView(analytics, { screen_name: name, screen_class: name }));
};

/**
 * Test-only reset: clears the cached instance and the last-screen guard so the
 * next call re-resolves the module. Exported for the sake of documentation;
 * nothing in the app should need it.
 */
export const resetAnalyticsForTests = (): void => {
  cachedInstance = null;
  cacheLoaded = false;
  lastScreen = null;
};
