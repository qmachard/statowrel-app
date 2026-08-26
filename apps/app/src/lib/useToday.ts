import { useSyncExternalStore } from 'react';
import { AppState, type NativeEventSubscription } from 'react-native';

import { addDays, startOfDay } from './dates';

/**
 * Today, as a value that **moves** — local midnight, re-read whenever the day
 * can have turned under the app.
 *
 * A `useMemo(() => startOfDay(new Date()), [])` is the obvious way to write
 * this, and it is wrong: React Native keeps the JS context alive while the app
 * sits in the background, so a screen mounted yesterday evening is still
 * holding yesterday when the 07:00 notification brings its user back. Every
 * date-dependent thing on the Stats screen then reads against the wrong day —
 * the pink cell lands on the eve, and `resolveStreakCount`, which only accepts
 * a last answer dated today or yesterday, reads a streak that has just been
 * extended as broken. Pulling the screen down does not help: a refresh re-reads
 * Firestore, not the clock. Killing the app is what fixed it, which is exactly
 * the shape of a value captured at mount.
 *
 * So the day is held here, once for the whole app, and turns on two occasions:
 *
 * - **Coming back to the foreground.** The one that matters in practice — a
 *   phone spends the night asleep, and JS timers do not fire while iOS has the
 *   process suspended.
 * - **A timer armed on the next midnight.** For the app that is up and watched
 *   as the day turns; a second past, so it can never fire on the day it leaves.
 *
 * An external store rather than a hook's state — the same shape `calendarCache`
 * and `answerStore` already use — so every consumer reads one clock: two
 * screens cannot disagree on what day it is, and the `Date` handed out keeps
 * its reference until the day actually changes, which is the stable snapshot
 * `useSyncExternalStore` asks for.
 */
let today = startOfDay(new Date());

const listeners = new Set<() => void>();

let midnight: ReturnType<typeof setTimeout> | null = null;
let foreground: NativeEventSubscription | null = null;

/** Re-reads the clock, tells the subscribers when the day has turned, and re-arms. */
const sync = (): void => {
  const current = startOfDay(new Date());

  if (current.getTime() !== today.getTime()) {
    today = current;
    listeners.forEach((listener) => listener());
  }

  armMidnight();
};

const armMidnight = (): void => {
  if (midnight !== null) {
    clearTimeout(midnight);
  }

  // The floor guards against a clock jumped backwards mid-run: a delay of zero
  // would only cost an extra tick, but there is no reason to spin on it.
  midnight = setTimeout(sync, Math.max(addDays(today, 1).getTime() - Date.now() + 1_000, 1_000));
};

/**
 * The clock runs only while somebody is looking at it: the first subscriber
 * arms it, the last one takes it down. Nothing here is worth a timer and an
 * `AppState` listener held over an app whose screens are all unmounted.
 */
const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);

  if (listeners.size === 1) {
    foreground = AppState.addEventListener('change', (status) => {
      if (status === 'active') {
        sync();
      }
    });

    // Whatever happened while nobody held the store — including a day turned
    // between the last unmount and this mount.
    sync();
  }

  return () => {
    listeners.delete(listener);

    if (listeners.size === 0) {
      foreground?.remove();
      foreground = null;

      if (midnight !== null) {
        clearTimeout(midnight);
        midnight = null;
      }
    }
  };
};

/** Local midnight of the day the app is *currently* on. Re-renders when it turns. */
export const useToday = (): Date => useSyncExternalStore(subscribe, () => today);
