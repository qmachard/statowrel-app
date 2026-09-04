import {
  USER_COLLECTION,
  USER_REFERRAL_COLLECTION,
  type UserReferralData,
  userReferralConverter,
} from '@statowrel/models';
import { onSnapshot, orderBy, query } from '@react-native-firebase/firestore';
import { useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/auth/AuthContext';
import { getSubCollectionRef } from '@/lib/firestore';

export interface Referrals {
  /** Newest first — the one just arrived is the one being looked for. */
  referrals: UserReferralData[];
  /** True until the first snapshot lands — never true again afterwards. */
  loading: boolean;
  /** The subscription could not be established, or was lost. */
  failed: boolean;
}

/** What the last snapshot said — `null` until one has landed. */
interface Landed {
  referrals: UserReferralData[];
  failed: boolean;
}

const EMPTY: Referrals = { referrals: [], loading: false, failed: false };

/**
 * Everybody this account brought into the app, live — docs/prd.md §4.9.
 *
 * **One sub-collection read, and no index.** The sponsor's side is denormalized
 * under their own profile (`v1_user_referral.ts`), so this is the same shape as
 * the friend list rather than a query over `v1_users` filtered on `referred_by`
 * — which `firestore.rules` could not scope anyway, a `list` rule being unable
 * to require a filter.
 *
 * Subscribed rather than read once, for the reason « Mes questions » is: the
 * rows change from somebody else's device entirely. A row appears when a
 * newcomer signs up and settles when they answer, and neither happens on this
 * phone.
 *
 * The loading flag is derived rather than stored, like `useFriends` — « no
 * snapshot yet, and there is a session » is what loading *is*.
 */
export const useReferrals = (): Referrals => {
  const { user } = useAuth();
  const userId = user?.uid ?? null;

  const [ landed, setLanded ] = useState<Landed | null>(null);

  useEffect(() => {
    if (userId === null) {
      return undefined;
    }

    const mine = query(
      getSubCollectionRef(USER_COLLECTION, userId, USER_REFERRAL_COLLECTION, userReferralConverter),
      orderBy('created_at', 'desc'),
    );

    return onSnapshot(
      mine,
      (snapshot) => setLanded({ referrals: snapshot.docs.map((entry) => entry.data()), failed: false }),
      (error: unknown) => {
        // Said out loud on the card rather than swallowed: a failed read renders
        // as « personne n'est encore venu », which is the one wrong thing to
        // tell somebody who has just sent their link to ten people.
        console.warn('[referrals] could not read the referrals', error);
        setLanded({ referrals: [], failed: true });
      },
    );
  }, [ userId ]);

  return useMemo(() => {
    if (landed === null) {
      return userId === null ? EMPTY : { ...EMPTY, loading: true };
    }

    return { ...landed, loading: false };
  }, [ landed, userId ]);
};
