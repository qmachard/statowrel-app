import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

/**
 * Versioned, so a rewritten carousel can be shown again to people who already
 * went through the first one — by bumping the suffix rather than by clearing
 * anything.
 */
const STORAGE_KEY = 'statowrel.onboarding.seen.v1';

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
 * On the device rather than on the account, and deliberately: the carousel runs
 * *before* sign-up, so there is no account to hang it on yet — and somebody
 * signing in on a fresh install is somebody who has never seen this phone show
 * them the app.
 *
 * Storage that cannot be read is treated as « already seen ». A carousel is not
 * worth risking on every launch of a phone whose storage is misbehaving, and the
 * app underneath works without it.
 */
export const useOnboardingSeen = (): OnboardingSeen => {
  const [ state, setState ] = useState<{ resolved: boolean; seen: boolean }>({ resolved: false, seen: true });

  useEffect(() => {
    let cancelled = false;

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

    return () => {
      cancelled = true;
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
