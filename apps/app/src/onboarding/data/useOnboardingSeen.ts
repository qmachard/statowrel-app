import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

/**
 * Versioned, so a rewritten carousel can be shown again to people who already
 * went through the first one — by bumping the suffix rather than by clearing
 * anything.
 *
 * Keyed by the account, because the carousel comes *after* signing in: two
 * accounts on one phone each get shown it once, and signing out and back in
 * does not replay it. It stays on the device all the same — a second phone
 * shows it again, which is the cheap side of the trade: the alternative is a
 * field on `v1_users` that the profile rules would have to let a client move.
 */
const storageKeyOf = (userId: string) => `statowrel.onboarding.seen.v1:${userId}`;

export interface OnboardingSeen {
  /** False until the flag has been read — the splash screen is held on it. */
  resolved: boolean;
  seen: boolean;
  /** Marks it seen for good: the carousel closes on the state, the write follows. */
  markSeen: () => void;
}

/**
 * Whether this account has already been through the onboarding carousel on this
 * phone.
 *
 * Storage that cannot be read is treated as « already seen ». A carousel is not
 * worth risking on every launch of a phone whose storage is misbehaving, and
 * the app underneath works without it.
 *
 * The account is carried **on the state** rather than reset by an effect: a
 * flag belonging to the previous session is simply not current, which is also
 * what keeps the carousel from flashing for one render after an account switch
 * (see the same shape in `src/daily-question/data/useDailyQuestion.ts`).
 */
export const useOnboardingSeen = (userId: string | null): OnboardingSeen => {
  const [ loaded, setLoaded ] = useState<{ userId: string; seen: boolean } | null>(null);

  useEffect(() => {
    if (userId === null) {
      return undefined;
    }

    let cancelled = false;

    AsyncStorage.getItem(storageKeyOf(userId))
      .then((value) => {
        if (!cancelled) {
          setLoaded({ userId, seen: value !== null });
        }
      })
      .catch((error: unknown) => {
        console.warn('[onboarding] could not read the carousel flag', error);

        if (!cancelled) {
          setLoaded({ userId, seen: true });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [ userId ]);

  const current = userId !== null && loaded?.userId === userId ? loaded : null;

  const markSeen = useCallback(() => {
    if (userId === null) {
      return;
    }

    setLoaded({ userId, seen: true });

    // The carousel is already gone by here: a write that fails costs one extra
    // showing at the next launch, not a stuck screen.
    AsyncStorage.setItem(storageKeyOf(userId), new Date().toISOString()).catch((error: unknown) => {
      console.warn('[onboarding] could not remember the carousel was seen', error);
    });
  }, [ userId ]);

  return {
    // Signed out there is nothing to wait for: the carousel only ever shows to
    // an account, so the splash has no reason to hold on this.
    resolved: userId === null || current !== null,
    seen: current?.seen ?? true,
    markSeen,
  };
};
