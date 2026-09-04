import {
  DAILY_QUESTION_ANSWER_COLLECTION,
  dailyQuestionAnswerConverter,
  QUESTION_COLLECTION,
  questionConverter,
  USER_CALENDAR_MONTH_COLLECTION,
  USER_COLLECTION,
  USER_FRIEND_COLLECTION,
  userCalendarMonthConverter,
  type UserData,
  type UserFriendData,
  userConverter,
  userFriendConverter,
} from '@statowrel/models';

import { FieldValue, Timestamp, type DocumentReference, type Query } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';

import { createBulkWriter, getDocumentRef, getSubCollectionRef, getSubDocumentRef } from '@/libs/firebase-admin';

/** How many friend lists are read at once — enough to stay fast, low enough not to open a query per user of the app at the same instant. */
const READS_IN_FLIGHT = 20;

export interface FriendsAnswersDigest {
  /**
   * Firebase Auth UIDs that have « done their day » — answered *or* spent a
   * joker — on the day's question. These are the people the nudge is *not*
   * for, and the ones whose friends earn a badge from them.
   */
  answered: Set<string>;
  /** How many accepted friends have done their day, per user. A user absent from the map has none. */
  friendsAnswered: Map<string, number>;
}

/**
 * The UIDs that « did their day » on a question — one answer per user per
 * question, the document id being the user's UID (docs/prd.md §4.5, §4.8).
 *
 * Jokers live in the same sub-collection as answers with `is_joker: true`,
 * so this single collection read covers both — the nudge that filters out
 * the done, and the count of friends who have done it, whether they
 * answered or jokered.
 */
const doneIdsOf = async (questionId: string): Promise<Set<string>> => {
  const questionRef = getDocumentRef(QUESTION_COLLECTION, questionId, questionConverter);

  const snapshot = await getSubCollectionRef(
    questionRef,
    DAILY_QUESTION_ANSWER_COLLECTION,
    dailyQuestionAnswerConverter,
  ).get();

  return new Set(snapshot.docs.map((document) => document.id));
};

/**
 * One user's accepted friendships — the same half of the friendship the app's
 * friend list reads, and the one whose document id is the friend's UID.
 *
 * Handed over as a query rather than as a result because its two callers read
 * it differently: the nudge walks it for every answerer of the day, the answer
 * trigger runs it once, after its transaction has committed, to fan the badge
 * out onto those friends' calendars.
 */
export const acceptedFriendsQuery = (
  userRef: DocumentReference<UserData>,
): Query<UserFriendData> => (
  getSubCollectionRef(userRef, USER_FRIEND_COLLECTION, userFriendConverter)
    .where('status', '==', 'accepted')
);

/** The UIDs of one user's accepted friends. */
const acceptedFriendIdsOf = async (userId: string): Promise<string[]> => {
  const snapshot = await acceptedFriendsQuery(getDocumentRef(USER_COLLECTION, userId, userConverter)).get();

  return snapshot.docs.map((document) => document.id);
};

/**
 * Increment `friend_answer_counts.{DD}` on the same month document under every
 * accepted friend of `userRef` — the badge of docs/prd.md §5.2. Called after
 * an answer's or a joker's transaction has committed, on purpose: a
 * friendship is reciprocal, so two friends acting at the same moment each
 * write into the very document the other is reading, and holding that
 * contention inside the caller's transaction would risk giving up on the
 * calendar projection, the streak and the wallet debit rather than on one
 * badge counter. Failures are logged rather than thrown — the deed itself is
 * already durable, and re-throwing would only redeliver the trigger onto the
 * marker it bails out on.
 *
 * Shared by the answer trigger and by `useJoker`: a joker « counts » in
 * exactly the same way as an answer for the friends' side of docs/prd.md §4.5
 * (« Joker complet »), and duplicating this fan-out would be one place a
 * behavioural drift could open up between the two paths.
 */
export const fanOutFriendAnswerBadge = async (
  userRef: DocumentReference<UserData>,
  monthKey: string,
  monthDayKey: string,
  date: string,
): Promise<void> => {
  const friends = await acceptedFriendsQuery(userRef).get();

  if (friends.empty) {
    return;
  }

  const writer = createBulkWriter();

  friends.docs.forEach((friendship) => {
    const friendCalendarMonthRef = getSubDocumentRef(
      getDocumentRef(USER_COLLECTION, friendship.id, userConverter),
      USER_CALENDAR_MONTH_COLLECTION,
      monthKey,
      userCalendarMonthConverter,
    ).withConverter(null);

    // Same `merge` as the author's own projection — the friend may have no
    // calendar month for this month at all — and an `increment`, since several
    // friends acting the same day land on the same field. The converter is
    // dropped for this one write: its `toFirestore` would rebuild the map value
    // by value and throw the sentinel away, and there is nothing here for it
    // to convert.
    writer.set(friendCalendarMonthRef, {
      month: monthKey,
      friend_answer_counts: { [monthDayKey]: FieldValue.increment(1) },
      updated_at: Timestamp.now(),
    }, { merge: true }).catch((error: unknown) => {
      logger.error('Could not count this deed onto a friend', {
        date,
        error,
        friend_id: friendship.id,
        user_id: userRef.id,
      });
    });
  });

  await writer.close();

  logger.info('Deed counted onto the friends', { date, friends: friends.size, user_id: userRef.id });
};

/**
 * What the 18:00 nudge needs to know about a day: who has answered, and how
 * many friends each user can be told about — docs/prd.md §4.5.
 *
 * The counts are walked from the **answerers** rather than from the users: a
 * friendship is mirrored under both sides, so reading the friends of everybody
 * who answered yields every user with a count to receive, and the count itself,
 * in the same pass. Going the other way would mean one query per account in the
 * database to discover that most of them have nothing to be told.
 *
 * Whoever answered stays in `answered` and is what the caller filters the
 * fan-out on: the nudge asks « Et toi ? », which is a question only somebody
 * who still owes an answer can be asked. Their own friends are counted through
 * them all the same.
 *
 * Reads scale with the number of answerers, not with the number of users, and
 * are capped at `READS_IN_FLIGHT` at a time. Held in memory whole, the same bet
 * `listRegisteredDevices` makes.
 */
export const friendsAnswersDigest = async (questionId: string): Promise<FriendsAnswersDigest> => {
  const answered = await doneIdsOf(questionId);
  const answererIds = [ ...answered ];

  const friendsAnswered = new Map<string, number>();

  for (let index = 0; index < answererIds.length; index += READS_IN_FLIGHT) {
    const lists = await Promise.all(
      answererIds.slice(index, index + READS_IN_FLIGHT).map(acceptedFriendIdsOf),
    );

    for (const friendId of lists.flat()) {
      friendsAnswered.set(friendId, (friendsAnswered.get(friendId) ?? 0) + 1);
    }
  }

  return { answered, friendsAnswered };
};
