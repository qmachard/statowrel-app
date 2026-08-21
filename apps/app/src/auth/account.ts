import { DELETE_ACCOUNT_CALLABLE, type DeleteAccountResult } from '@statowrel/models';

import { clearFriends } from '@/friends/data/friendsStore';
import { auth } from '@/lib/firebase';
import { callFunction } from '@/lib/functions';

import { signOut } from './providers';

/**
 * Deletes the signed-in account — docs/prd.md §4.1, and what both stores ask
 * for of any app that lets someone sign up inside it.
 *
 * The app writes nothing here, the way the invitation sheet writes nothing:
 * `firestore.rules` denies deleting a profile, a username reservation and an
 * answer to every client, so the whole operation is the `users-deleteAccount`
 * callable's (see `apps/functions/src/domains/users/callables/deleteAccount.ts`).
 *
 * Signing out afterwards is local housekeeping, not the deletion: the Auth user
 * is already gone by then, so the persisted session has nothing left to restore
 * — but nothing has told this device yet, and clearing it is what sends the
 * navigator back to the signed-out half of the stack now rather than at the
 * next token refresh.
 */
export const deleteAccount = async (): Promise<void> => {
  // Read before the callable runs: it deletes the Auth user, so `currentUser`
  // is on borrowed time and the key the friend list is stored under would go
  // with it — leaving that copy on the phone with nothing left able to name it.
  const uid = auth.currentUser?.uid ?? null;

  await callFunction<Record<string, never>, DeleteAccountResult>(DELETE_ACCOUNT_CALLABLE, {});

  await clearFriends(uid);

  await signOut();
};
