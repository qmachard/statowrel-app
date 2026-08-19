import type { User } from 'firebase/auth';
import { Timestamp, getDoc, setDoc, updateDoc } from 'firebase/firestore';

import {
  type AuthProviderId,
  type UserData,
  USER_COLLECTION,
  isAuthProviderId,
  userConverter,
} from '@statowrel/models';

import { getDocumentRef } from '@/lib/firestore';

import type { ProfileHints } from './profileHints';

/** `firestore.rules` rejects an empty pseudo, and no provider is guaranteed to give one. */
const DEFAULT_DISPLAY_NAME = 'Nouveau joueur';

const authProvidersOf = (user: User): AuthProviderId[] => (
  Array.from(new Set(
    user.providerData
      .map((provider) => provider.providerId)
      .filter(isAuthProviderId),
  ))
);

/**
 * Pre-fill order (docs/prd.md §4.1): what the sign-up flow just captured, then
 * what the provider gave Firebase Auth, then the email's local part.
 */
const displayNameOf = (user: User, hints?: ProfileHints | null): string => (
  hints?.displayName?.trim()
  || user.displayName?.trim()
  || user.email?.split('@')[0]?.trim()
  || DEFAULT_DISPLAY_NAME
);

const sameProviders = (left: AuthProviderId[], right: AuthProviderId[]): boolean => (
  left.length === right.length && left.every((provider) => right.includes(provider))
);

/**
 * Creates the signed-in account's profile document — `v1_users/{uid}`, keyed by
 * the Firebase Auth UID — or brings an existing one back in sync with Auth.
 *
 * Idempotent: it reads first and only writes when something actually differs,
 * so it is safe to call on every sign-in and on every session restore.
 */
export const ensureUserProfile = async (user: User, hints?: ProfileHints | null): Promise<UserData> => {
  const ref = getDocumentRef(USER_COLLECTION, user.uid, userConverter);
  const snapshot = await getDoc(ref);
  const now = new Date().toISOString();
  const email = user.email ?? null;
  const authProviders = authProvidersOf(user);

  if (!snapshot.exists()) {
    const profile: UserData = {
      display_name: displayNameOf(user, hints),
      photo_url: user.photoURL ?? null,
      email,
      auth_providers: authProviders,
      created_at: now,
      updated_at: now,
      // The streak belongs to the backend from here on — the app only ever seeds
      // it, because nothing else creates this document.
      streak_count: 0,
      streak_best: 0,
      streak_last_answered_on: null,
    };

    await setDoc(ref, profile);

    return profile;
  }

  const current = snapshot.data();
  // The pseudo and the avatar belong to the user once the profile exists — only
  // fill them in when they are still missing, never overwrite a chosen one.
  const displayName = current.display_name || displayNameOf(user, hints);
  const photoUrl = current.photo_url ?? user.photoURL ?? null;

  const isUpToDate = current.display_name === displayName
    && current.photo_url === photoUrl
    && current.email === email
    && sameProviders(current.auth_providers, authProviders);

  if (isUpToDate) {
    return current;
  }

  // Only the profile fields are written back, and through update() rather than
  // set(): a whole-document set() would carry the streak values read a moment
  // ago, reverting whatever the answer trigger wrote in between. update() also
  // leaves `created_at` alone, which `firestore.rules` requires.
  //
  // update() does not run the converter (see the repo's CLAUDE.md), so
  // `updated_at` is written as a Timestamp here rather than as an ISO string.
  await updateDoc(ref, {
    display_name: displayName,
    photo_url: photoUrl,
    email,
    auth_providers: authProviders,
    updated_at: Timestamp.now(),
  });

  return {
    ...current,
    display_name: displayName,
    photo_url: photoUrl,
    email,
    auth_providers: authProviders,
    updated_at: now,
  };
};
