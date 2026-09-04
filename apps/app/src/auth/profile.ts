import type { User } from '@react-native-firebase/auth';
import { Timestamp, getDoc, setDoc, updateDoc } from '@react-native-firebase/firestore';

import {
  type AuthProviderId,
  INITIAL_STATFLOUZZ_BALANCE,
  type UserData,
  USER_COLLECTION,
  USERNAME_COLLECTION,
  isAuthProviderId,
  normalizeUsername,
  userConverter,
  usernameConverter,
} from '@statowrel/models';

import { track } from '@/analytics/analytics';
import { isFirebaseError } from '@/lib/firebaseError';
import { getDocumentRef } from '@/lib/firestore';

import { ReferrerNotFoundError, UsernameTakenError } from './errors';

/**
 * Turns the handle typed under « Qui t'a fait venir ? » into the sponsor's UID
 * — docs/prd.md §4.9.
 *
 * **Both documents are read, not just the reservation.** `firestore.rules`
 * accepts `referred_by` on a profile `create` only if a profile exists at that
 * UID, and a denied create is a user who cannot finish signing up at all. The
 * window where a reservation exists without its profile is real: they are two
 * sequential writes, in that order, a few milliseconds apart (see
 * `createUserProfile` below). Reading both here turns a hard onboarding failure
 * into « on ne connaît pas ce pseudo » under the field, which is recoverable.
 *
 * An empty field is nobody, and that is not an error — the sponsor is optional.
 * One's own handle is dropped rather than refused: it can only be typed while
 * completing a profile that already holds it, and nobody is their own sponsor.
 */
const resolveReferrer = async (userId: string, typed: string): Promise<string | null> => {
  const handle = normalizeUsername(typed);

  if (handle === '') {
    return null;
  }

  const reservation = await getDoc(getDocumentRef(USERNAME_COLLECTION, handle, usernameConverter));

  if (!reservation.exists()) {
    throw new ReferrerNotFoundError(handle);
  }

  const sponsorId = reservation.data().user_id;

  if (sponsorId === userId) {
    return null;
  }

  const sponsor = await getDoc(getDocumentRef(USER_COLLECTION, sponsorId, userConverter));

  if (!sponsor.exists()) {
    throw new ReferrerNotFoundError(handle);
  }

  return sponsorId;
};

const authProvidersOf = (user: User): AuthProviderId[] => (
  Array.from(new Set(
    user.providerData
      .map((provider) => provider.providerId)
      .filter(isAuthProviderId),
  ))
);

const sameProviders = (left: AuthProviderId[], right: AuthProviderId[]): boolean => (
  left.length === right.length && left.every((provider) => right.includes(provider))
);

/**
 * Reads the signed-in account's profile — `v1_users/{uid}`, keyed by the
 * Firebase Auth UID — and brings it back in sync with Auth.
 *
 * Returns `null` when the document does not exist: the account has signed in
 * but has not chosen its username yet, and the onboarding sheet is what creates
 * the document (`createUserProfile` below). Nothing here ever creates it —
 * `firestore.rules` rejects a profile whose username is not reserved, and no
 * provider is allowed to supply one (docs/prd.md §4.1).
 *
 * Idempotent: it reads first and only writes when something actually differs,
 * so it is safe to call on every sign-in and on every session restore.
 */
export const syncUserProfile = async (user: User): Promise<UserData | null> => {
  const ref = getDocumentRef(USER_COLLECTION, user.uid, userConverter);
  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) {
    return null;
  }

  const current = snapshot.data();

  // A profile carrying no username predates them. `firestore.rules` denies every
  // update to it until a handle has been reserved, so there is nothing to sync
  // here — `createUserProfile` completes it in place once the sheet is through.
  if (!current.username) {
    return current;
  }

  const email = user.email ?? null;
  const authProviders = authProvidersOf(user);

  // The username is never touched here: it is the user's, and it is bound to a
  // reservation.
  const isUpToDate = current.email === email
    && sameProviders(current.auth_providers, authProviders);

  if (isUpToDate) {
    return current;
  }

  // Only the mirrored fields are written back, and through update() rather than
  // set(): a whole-document set() would carry the streak values read a moment
  // ago, reverting whatever the answer trigger wrote in between. update() also
  // leaves `created_at` alone, which `firestore.rules` requires.
  //
  // update() does not run the converter (see the repo's CLAUDE.md), so
  // `updated_at` is written as a Timestamp here rather than as an ISO string.
  await updateDoc(ref, {
    email,
    auth_providers: authProviders,
    updated_at: Timestamp.now(),
  });

  return {
    ...current,
    email,
    auth_providers: authProviders,
    updated_at: new Date().toISOString(),
  };
};

/**
 * Claims `username` for this account, then writes the profile carrying it.
 *
 * Two writes rather than one batch, in this order and no other. Firestore
 * denies a `create` on a document that already exists, so the reservation is
 * what makes the username unique — and `firestore.rules` only accepts the
 * profile once it can *read* that reservation back. A batch would defeat that:
 * rules evaluate each write of a batch against the state before it, so the
 * reservation would still be invisible to the profile's own check.
 *
 * A reservation the user already holds is rewritten rather than refused, so a
 * retry after a failed profile write goes through instead of colliding with
 * the user's own first attempt.
 */
export const createUserProfile = async (
  user: User,
  username: string,
  /** The profile being completed, when one already exists without a username. */
  current: UserData | null,
  /**
   * The sponsor's handle, as typed — docs/prd.md §4.9. Empty for everybody who
   * arrived on their own.
   *
   * Ignored outright when `current` is not null: `referred_by` is only ever
   * accepted on a `create`, and a profile that already exists is being
   * completed. The sheet does not show the field in that case either, so
   * nothing is silently dropped.
   */
  referrerUsername = '',
): Promise<UserData> => {
  const handle = normalizeUsername(username);
  // Resolved before the reservation is claimed: an unknown sponsor has to fail
  // while the handle is still free, otherwise a retry collides with the user's
  // own half-finished attempt.
  const referredBy = current === null ? await resolveReferrer(user.uid, referrerUsername) : null;
  const now = new Date().toISOString();
  const reservationRef = getDocumentRef(USERNAME_COLLECTION, handle, usernameConverter);
  const reservation = await getDoc(reservationRef);

  // Firestore would refuse the write on its own — a `create` on an existing
  // document is denied outright — but reading first tells a handle someone else
  // holds apart from a write that failed for any other reason, which is the
  // difference between "choisis-en un autre" and "réessaie".
  if (reservation.exists() && reservation.data().user_id !== user.uid) {
    throw new UsernameTakenError();
  }

  try {
    await setDoc(reservationRef, {
      user_id: user.uid,
      created_at: reservation.data()?.created_at ?? now,
    });
  } catch (error) {
    // Someone claimed the handle between the read above and this write.
    // `firestore/permission-denied`, not the bare `permission-denied` the web
    // SDK reported: React Native Firebase namespaces every code by the module
    // that raised it (see `src/lib/firebaseError.ts`).
    if (isFirebaseError(error) && error.code === 'firestore/permission-denied') {
      throw new UsernameTakenError();
    }

    throw error;
  }

  const profile: UserData = {
    username: handle,
    email: user.email ?? null,
    auth_providers: authProvidersOf(user),
    // Carried over when the document predates the username: `firestore.rules`
    // refuses an update that moves `created_at`, and it refuses one that moves
    // a counter either — those belong to the answer trigger, and the app only
    // ever seeds them on a genuinely new profile.
    created_at: current?.created_at ?? now,
    updated_at: now,
    streak_count: current?.streak_count ?? 0,
    streak_best: current?.streak_best ?? 0,
    answers_count: current?.answers_count ?? 0,
    streak_last_answered_on: current?.streak_last_answered_on ?? null,
    // The wallet opens at `INITIAL_STATFLOUZZ_BALANCE`, and the rules check that
    // it does: a create is the one write a client makes to these fields, so it
    // is the one place a balance could be invented (docs/prd.md §4.7). The
    // opening amount lets a fresh account try a joker before the first streak
    // milestone pays; `statcoins_earned` stays 0 because the grant is not
    // something the user earned, and that is also what the retroactive
    // backfill (`backfill-initial-balance.mjs`) uses to tell a fresh account
    // from one that has already touched its wallet.
    statcoin_balance: current?.statcoin_balance ?? INITIAL_STATFLOUZZ_BALANCE,
    statcoins_earned: current?.statcoins_earned ?? 0,
    statcoins_spent: current?.statcoins_spent ?? 0,
    // The one field on this document a client may write and never rewrite
    // (docs/prd.md §4.9). Carried over on the completion path rather than
    // recomputed: the rules refuse an update that moves it, null included.
    referred_by: current === null ? referredBy : (current.referred_by ?? null),
    // Backend-owned from here on, like the wallet above: `users-onUserCreated`
    // opens the referral, and the payout trigger is what ever moves these.
    referrals_count: current?.referrals_count ?? 0,
    referral_rewarded_at: current?.referral_rewarded_at ?? null,
  };

  await setDoc(getDocumentRef(USER_COLLECTION, user.uid, userConverter), profile);

  if (referredBy !== null) {
    track({ name: 'referral_attributed' });
  }

  return profile;
};
