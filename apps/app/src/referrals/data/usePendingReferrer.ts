import { useEffect, useState } from 'react';

import { readPendingReferrer } from './pendingReferrerStore';

/**
 * The handle a `/i/{handle}` link left behind, for the one form that can spend
 * it — the username sheet's « Qui t'a fait venir ? » (docs/prd.md §4.9).
 *
 * `enabled` is the sheet's own `canBeReferred`: a profile that already exists
 * is being *completed*, and `referred_by` is only accepted on a create, so
 * there is nothing to read and no reason to touch the disk.
 *
 * It comes back `null` until the read lands, which is why the sheet applies it
 * with an effect rather than as a default value — the form is mounted before
 * AsyncStorage answers.
 */
export const usePendingReferrer = (enabled: boolean): string | null => {
  const [ referrer, setReferrer ] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    let cancelled = false;

    void readPendingReferrer().then((username) => {
      if (!cancelled) {
        setReferrer(username);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [ enabled ]);

  return referrer;
};
