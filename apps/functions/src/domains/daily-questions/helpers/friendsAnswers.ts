import {
  DAILY_QUESTION_ANSWER_COLLECTION,
  dailyQuestionAnswerConverter,
  QUESTION_COLLECTION,
  questionConverter,
  USER_COLLECTION,
  USER_FRIEND_COLLECTION,
  type UserData,
  type UserFriendData,
  userConverter,
  userFriendConverter,
} from '@statowrel/models';

import type { DocumentReference, Query } from 'firebase-admin/firestore';

import { getDocumentRef, getSubCollectionRef } from '@/libs/firebase-admin';

/** How many friend lists are read at once — enough to stay fast, low enough not to open a query per user of the app at the same instant. */
const READS_IN_FLIGHT = 20;

export interface FriendsAnswersDigest {
  /** Firebase Auth UIDs that have answered the day's question — the people the nudge is *not* for. */
  answered: Set<string>;
  /** How many accepted friends have answered, per user. A user absent from the map has none. */
  friendsAnswered: Map<string, number>;
}

/** The UIDs that answered a question, read off the document ids — one answer per user, id = their UID. */
const answererIdsOf = async (questionId: string): Promise<Set<string>> => {
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
 * Handed over as a query rather than as a result so the answer trigger can run
 * it inside its own transaction, where the fan-out onto the friends' calendars
 * has to be read and written atomically with the answer it comes from.
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
  const answered = await answererIdsOf(questionId);
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
