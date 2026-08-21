import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

/**
 * Versioned, so a rewritten carousel can be shown again to people who already
 * went through the first one — by bumping the suffix rather than by clearing
 * anything.
 *
 * On the device and not on an account, because the carousel runs *before* there
 * is one. Somebody signing in on a fresh install is somebody whose phone has
 * never shown them the app.
 */
const STORAGE_KEY = 'statowrel.onboarding.seen.v1';

/**
 * Told when the flag is cleared, so the carousel comes back on the spot rather
 * than at the next launch — `src/App.tsx` mounts the hook, and the button that
 * clears it lives three screens away in the Menu.
 *
 * A set of callbacks rather than a module store: nothing here has a value to
 * publish, only a moment to announce.
 */
const resetListeners = new Set<() => void>();

/**
 * Puts this phone back where it was before the carousel — **development only**,
 * behind the Menu's `__DEV__` button. There is no product reason to replay the
 * onboarding, and nothing in the app calls this outside that button.
 */
export const resetOnboardingSeen = async (): Promise<void> => {
  await AsyncStorage.removeItem(STORAGE_KEY);

  resetListeners.forEach((notify) => notify());
};

export interface OnboardingSeen {
  /** False until the flag has been read — the splash screen is held on it. */
  resolved: boolean;
  seen: boolean;
  /** Marks it seen for good: the carousel closes on the state, the write follows. */
  markSeen: () => void;
}

/**
 * Whether this install has already been through the onboarding carousel.
 *
 * Storage that cannot be read is treated as « already seen ». A carousel is not
 * worth risking on every launch of a phone whose storage is misbehaving, and
 * the app underneath works without it.
 */
export const useOnboardingSeen = (): OnboardingSeen => {
  const [ state, setState ] = useState<{ resolved: boolean; seen: boolean }>({ resolved: false, seen: true });

  useEffect(() => {
    let cancelled = false;

    const read = () => {
      AsyncStorage.getItem(STORAGE_KEY)
        .then((value) => {
          if (!cancelled) {
            setState({ resolved: true, seen: value !== null });
          }
        })
        .catch((error: unknown) => {
          console.warn('[onboarding] could not read the carousel flag', error);

          if (!cancelled) {
            setState({ resolved: true, seen: true });
          }
        });
    };

    read();

    // The `__DEV__` reset clears the key from another screen; without this the
    // carousel would only come back at the next launch.
    const onReset = () => setState({ resolved: true, seen: false });

    resetListeners.add(onReset);

    return () => {
      cancelled = true;
      resetListeners.delete(onReset);
    };
  }, []);

  const markSeen = useCallback(() => {
    setState({ resolved: true, seen: true });

    // The carousel is already gone by here: a write that fails costs one extra
    // showing at the next launch, not a stuck screen.
    AsyncStorage.setItem(STORAGE_KEY, new Date().toISOString()).catch((error: unknown) => {
      console.warn('[onboarding] could not remember the carousel was seen', error);
    });
  }, []);

  return { ...state, markSeen };
};
