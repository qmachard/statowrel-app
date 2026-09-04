import { useCallback } from 'react';

import { navigationRef } from '@/navigation/navigationRef';

import { setScreen } from './analytics';

/**
 * Returns the `onStateChange` handler `NavigationContainer` calls on every
 * navigation state change.
 *
 * `google_analytics_automatic_screen_reporting_enabled` is turned **off** in
 * `apps/app/firebase.json` on purpose: RN Firebase's own auto-tracking labels
 * screens with the last iOS UIViewController name, which for a native stack is
 * always `RNSScreenStackHostController` — one name for every screen. Doing it
 * from the navigator gives GA4 the route name from `RootStackParamList` (Stats,
 * DailyQuestion, Menu, …), which is what the reports need.
 *
 * The wrapper's own `setScreen` deduplicates identical consecutive names, so a
 * state change that does not move the current route (params update, focus
 * flicker) is a no-op.
 */
export const useScreenTracking = (): (() => void) => (
  useCallback(() => {
    const route = navigationRef.getCurrentRoute();

    if (!route) {
      return;
    }

    setScreen(route.name);
  }, [])
);
