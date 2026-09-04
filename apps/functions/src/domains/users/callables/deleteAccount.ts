import {
  DAILY_QUESTION_ANSWER_COLLECTION,
  type DeleteAccountResult,
  USER_CALENDAR_MONTH_COLLECTION,
  USER_COLLECTION,
  USER_DEVICE_COLLECTION,
  USERNAME_COLLECTION,
  USER_FRIEND_COLLECTION,
  USER_REFERRAL_COLLECTION,
  dailyQuestionAnswerConverter,
  userCalendarMonthConverter,
  userConverter,
  userDeviceConverter,
  userFriendConverter,
  userReferralConverter,
  usernameConverter,
} from '@statowrel/models';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';

import {
  REGION_CLOUD,
  createWriteBatch,
  getAuth,
  getCollectionGroupRef,
  getDocumentRef,
  getSubCollectionRef,
  getSubDocumentRef,
  parseData,
} from '@/libs/firebase-admin';

/**
 * A write batch is capped at 500 operations. An account that has answered every
 * day for two years is past that on its answers alone, so the deletes are cut
 * into batches rather than assumed to fit in one.
 */
const BATCH_LIMIT = 400;

const deleteAll = async (refs: FirebaseFirestore.DocumentReference[]): Promise<void> => {
  for (let index = 0; index < refs.length; index += BATCH_LIMIT) {
    const batch = createWriteBatch();

    for (const ref of refs.slice(index, index + BATCH_LIMIT)) {
      batch.delete(ref);
    }

    await batch.commit();
  }
};

/**
 * Deletes the signed-in account and everything it owns — docs/prd.md §4.1,
 * where account deletion is listed as a store requirement.
 *
 * **A callable, and the only way this can happen.** `firestore.rules` denies
 * deleting a profile, a username reservation and an answer to every client, on
 * purpose: freeing a handle and dropping the mirrored half of a friendship from
 * *under the other user* are writes nobody can be held to, and no rule can
 * scope a delete to "everything this account owns".
 *
 * What goes, in the order it goes:
 *
 * 1. the answers, everywhere they sit (`v1_daily_question_answers`, keyed by
 *    this UID under each question). The questions' own `answer_counts` are left
 *    alone — the PRD asks for exactly that: the answers stop belonging to
 *    anybody but keep counting in the aggregate. The document id *is* the UID,
 *    so deleting it is what anonymising means here; there is no field to blank.
 * 2. the calendar months projected from them;
 * 3. this account's push destinations — a sub-collection survives the deletion
 *    of the document it hangs off, so without this the day's question would
 *    keep being pushed to a phone whose account no longer exists. The app drops
 *    its own token on sign-out, but not here: by the time it signs out the
 *    account is gone and that write is no longer one the rules allow;
 * 4. both halves of every friendship — the one in this user's list and its
 *    mirror in the friend's;
 * 5. the username reservation, which frees the handle;
 * 6. the profile;
 * 7. the Firebase Auth user.
 *
 * Auth last, deliberately: a failure halfway leaves an account that can still
 * sign in and retry, where the reverse would leave orphaned data nobody owns.
 * Every step is a delete, so a retry after a partial run is a no-op on what
 * already went.
 */
export const deleteAccount = onCall<unknown, Promise<DeleteAccountResult>>(
  { region: REGION_CLOUD },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in to delete your account.');
    }

    const userId = request.auth.uid;
    const userRef = getDocumentRef(USER_COLLECTION, userId, userConverter);

    const [ profile, answers, months, devices, friendships, referrals ] = await Promise.all([
      userRef.get().then(parseData),
      // The collection group is scoped by the `user_id` field rather than by
      // the document id: a group query cannot filter on `__name__` across
      // parents, and the field is carried on the answer for exactly this.
      //
      // It needs its own index, and not the composite one the calendar uses:
      // an automatic single-field index only ever covers `COLLECTION` scope, so
      // an equality on `user_id` across the group is a `FAILED_PRECONDITION`
      // until the `COLLECTION_GROUP` exemption in `firestore.indexes.json` is
      // deployed. `npm run deploy:firestore` is part of shipping this function.
      getCollectionGroupRef(DAILY_QUESTION_ANSWER_COLLECTION, dailyQuestionAnswerConverter)
        .where('user_id', '==', userId)
        .get(),
      getSubCollectionRef(userRef, USER_CALENDAR_MONTH_COLLECTION, userCalendarMonthConverter).get(),
      getSubCollectionRef(userRef, USER_DEVICE_COLLECTION, userDeviceConverter).get(),
      getSubCollectionRef(userRef, USER_FRIEND_COLLECTION, userFriendConverter).get(),
      // Who this account brought in (docs/prd.md §4.9). Its own list, so it
      // goes with it — the newcomers keep their accounts and their wallets, and
      // their `referred_by` is left pointing at a UID nobody holds any more,
      // which is what it means: they did come from somebody who has since left.
      getSubCollectionRef(userRef, USER_REFERRAL_COLLECTION, userReferralConverter).get(),
    ]);

    // Both halves of each friendship: the entry in this user's list, and the
    // one carrying this user's UID as its id in the friend's. A friend whose
    // half is already gone just gets a delete on nothing.
    const friendshipRefs = friendships.docs.flatMap((half) => [
      half.ref,
      getSubDocumentRef(
        getDocumentRef(USER_COLLECTION, half.data().friend_id, userConverter),
        USER_FRIEND_COLLECTION,
        userId,
        userFriendConverter,
      ),
    ]);

    // The other side of this account's own referral: the row sitting in its
    // sponsor's list. Left standing it would show a filleul nobody can open,
    // and one whose handle is about to be free for somebody else to take.
    //
    // The sponsor's `referrals_count` is deliberately *not* decremented: they
    // were paid for a referral that really happened, and rolling the counter
    // back would both rewrite that and hand back cap room — a delete-and-resign
    // loop past `REFERRAL_MAX_REWARDED`.
    const sponsorReferralRefs = profile?.referred_by
      ? [ getSubDocumentRef(
        getDocumentRef(USER_COLLECTION, profile.referred_by, userConverter),
        USER_REFERRAL_COLLECTION,
        userId,
        userReferralConverter,
      ) ]
      : [];

    await deleteAll([
      ...answers.docs.map((answer) => answer.ref),
      ...months.docs.map((month) => month.ref),
      ...devices.docs.map((device) => device.ref),
      ...friendshipRefs,
      ...referrals.docs.map((referral) => referral.ref),
      ...sponsorReferralRefs,
    ]);

    // The reservation is only this account's to free if it still points at it:
    // a handle that has changed hands is somebody else's, and the copy on the
    // profile is not the authority on who holds it.
    if (profile !== null && profile.username !== '') {
      const reservationRef = getDocumentRef(USERNAME_COLLECTION, profile.username, usernameConverter);
      const reservation = await reservationRef.get().then(parseData);

      if (reservation?.user_id === userId) {
        await reservationRef.delete();
      }
    }

    await userRef.delete();

    try {
      await getAuth().deleteUser(userId);
    } catch (error) {
      // Everything the account owned is already gone, so a session that
      // outlives it has nothing left to read. Reported rather than swallowed —
      // the Auth record is what still has to disappear.
      logger.error('Account data deleted but the Auth user survived', { user_id: userId, error });

      throw new HttpsError('internal', 'The account data was deleted but the sign-in could not be removed.');
    }

    logger.info('Account deleted', {
      user_id: userId,
      answers: answers.size,
      months: months.size,
      devices: devices.size,
      friendships: friendships.size,
    });

    return { outcome: 'deleted' };
  },
);
