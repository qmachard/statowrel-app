import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

/**
 * Where this phone stands on analytics.
 *
 * Opt-out on purpose — see `docs/analytics.md` § Consent model. Analytics are
 * on by default (finalité produit, aucun partage tiers, aucun tracking pub),
 * and the Menu carries a switch to turn them off (`AnalyticsOptOutRow`). The
 * flag lives on the *device* rather than on the account, because a decision
 * about what a phone sends is a decision about the phone, and because the
 * signed-out session also emits.
 *
 * Versioned like the onboarding flag: bumping the suffix retires an older
 * consent shape without silently reusing whatever people had answered.
 */
const STORAGE_KEY = 'statowrel.analytics.optout.v1';

const listeners = new Set<(optedOut: boolean) => void>();
let cached: boolean | null = null;

const notify = (value: boolean): void => {
  cached = value;

  listeners.forEach((listener) => listener(value));
};

/**
 * Reads the flag without waiting on a hook — the wrapper (`./analytics.ts`)
 * gates every call on this, so the value has to be readable from anywhere.
 *
 * A storage read that fails resolves to `false` (analytics allowed): the flag
 * is off by default, so a storage that cannot be read is « no opt-out on file ».
 */
export const readAnalyticsOptOut = async (): Promise<boolean> => {
  if (cached !== null) {
    return cached;
  }

  try {
    const value = await AsyncStorage.getItem(STORAGE_KEY);
    const optedOut = value === '1';

    cached = optedOut;

    return optedOut;
  } catch (error: unknown) {
    console.warn('[analytics] could not read the opt-out flag', error);
    cached = false;

    return false;
  }
};

/**
 * Writes the flag and tells every subscriber on the spot — the wrapper reads
 * this synchronously through `optedOut`, so the callable needs no round-trip.
 */
export const setAnalyticsOptOut = async (optedOut: boolean): Promise<void> => {
  notify(optedOut);

  try {
    if (optedOut) {
      await AsyncStorage.setItem(STORAGE_KEY, '1');
    } else {
      await AsyncStorage.removeItem(STORAGE_KEY);
    }
  } catch (error: unknown) {
    console.warn('[analytics] could not persist the opt-out flag', error);
  }
};

/**
 * The synchronous read the wrapper uses — the cache is warmed at launch by
 * `useAnalyticsIdentity`, so the first few events (before the read completes)
 * default to « allowed ». A false positive on the first launch, cleared as
 * soon as the flag lands.
 */
export const isAnalyticsOptedOut = (): boolean => cached ?? false;

/** Warm the cache from disk — called once at launch by `useAnalyticsIdentity`. */
export const primeAnalyticsOptOut = (): void => {
  if (cached === null) {
    void readAnalyticsOptOut();
  }
};

/** React hook for the Menu switch — mirrors `useOnboardingSeen`'s shape. */
export const useAnalyticsOptOut = (): { resolved: boolean; optedOut: boolean; setOptedOut: (value: boolean) => void } => {
  const [ state, setState ] = useState<{ resolved: boolean; optedOut: boolean }>({
    resolved: cached !== null,
    optedOut: cached ?? false,
  });

  useEffect(() => {
    const listener = (value: boolean) => setState({ resolved: true, optedOut: value });

    listeners.add(listener);

    if (cached === null) {
      void readAnalyticsOptOut().then((value) => {
        listener(value);
      });
    }

    return () => {
      listeners.delete(listener);
    };
  }, []);

  return {
    resolved: state.resolved,
    optedOut: state.optedOut,
    setOptedOut: (value: boolean) => {
      void setAnalyticsOptOut(value);
    },
  };
};
