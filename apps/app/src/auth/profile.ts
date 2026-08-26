import type { User } from '@react-native-firebase/auth';
import { Timestamp, setDoc, updateDoc } from '@react-native-firebase/firestore';

import {
  type AuthProviderId,
  type UserData,
  USER_COLLECTION,
  USERNAME_COLLECTION,
  isAuthProviderId,
  normalizeUsername,
  userConverter,
  usernameConverter,
} from '@statowrel/models';

import { isFirebaseError } from '@/lib/firebaseError';
import { getDocumentRef } from '@/lib/firestore';
import { readDoc } from '@/lib/firestoreReads';

import { UsernameTakenError } from './errors';

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
  const snapshot = await readDoc(ref, 'auth:profile upsert');

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
): Promise<UserData> => {
  const handle = normalizeUsername(username);
  const now = new Date().toISOString();
  const reservationRef = getDocumentRef(USERNAME_COLLECTION, handle, usernameConverter);
  const reservation = await readDoc(reservationRef, 'auth:username reservation');

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
  };

  await setDoc(getDocumentRef(USER_COLLECTION, user.uid, userConverter), profile);

  return profile;
};
