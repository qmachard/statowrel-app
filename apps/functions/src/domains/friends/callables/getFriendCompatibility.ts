import { HttpsError, onCall } from 'firebase-functions/v2/https';
import {
  FRIEND_COMPATIBILITY_COLLECTION,
  type FriendCompatibilityData,
  type FriendCompatibilityResult,
  USER_COLLECTION,
  USER_FRIEND_COLLECTION,
  dailyQuestionDateKey,
  friendCompatibilityConverter,
  friendCompatibilityId,
  userConverter,
  userFriendConverter,
} from '@statowrel/models';
import { z } from 'zod';

import {
  REGION_CLOUD,
  getDocumentRef,
  getSubDocumentRef,
  parseData,
} from '@/libs/firebase-admin';

import { compatibilityBetween } from '../helpers/compatibility';

const payloadSchema = z.object({
  friend_id: z.string().min(1),
});

/** What the callable hands back, from a stored document or from a fresh tally. */
const resultOf = (compatibility: Pick<FriendCompatibilityData, 'common_days' | 'matching_days' | 'score' | 'computed_on'>): FriendCompatibilityResult => ({
  common_days: compatibility.common_days,
  matching_days: compatibility.matching_days,
  score: compatibility.score,
  computed_on: compatibility.computed_on,
});

/**
 * How alike a friend answered — docs/prd.md §5.3, the number the friend screen
 * is built around.
 *
 * **A callable because the query is one no client may run.** A friend's answer
 * is readable one question at a time (`firestore.rules`, under
 * `v1_questions/{id}/v1_daily_question_answers`), and the collection group is
 * scoped to one's own answers — so that reading a day never turns into reading
 * a history. Comparing two histories is exactly that forbidden query, and the
 * only thing that leaves here is three numbers.
 *
 * **Cached per pair, per Paris day.** The score moves only when one of the two
 * answers, and everything in this app is grained by the day, so a document
 * computed today is served as it stands — whoever of the two opens the profile
 * first pays for it, and neither pays again until tomorrow. The cache is a
 * cache and nothing else: every field is recomputed from the answers, so
 * dropping the collection costs one recompute per pair and no data.
 *
 * The friendship is checked before anything is read. It has to be: the score is
 * about two named accounts, and without that check any signed-in user could ask
 * how alike they are to anybody whose UID they know.
 */
export const getFriendCompatibility = onCall<unknown, Promise<FriendCompatibilityResult>>(
  { region: REGION_CLOUD },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in to read a compatibility.');
    }

    const payload = payloadSchema.safeParse(request.data);

    if (!payload.success) {
      throw new HttpsError('invalid-argument', 'A friend id is required.');
    }

    const userId = request.auth.uid;
    const friendId = payload.data.friend_id;

    if (friendId === userId) {
      throw new HttpsError('failed-precondition', 'That is your own account.');
    }

    // The caller's own half of the friendship, whose document id is the
    // friend's UID — the same read the app's own list is built on, and the
    // whole membership check: there is no query to run, and a half that is
    // still `pending` is not a friendship yet.
    const friendship = await getSubDocumentRef(
      getDocumentRef(USER_COLLECTION, userId, userConverter),
      USER_FRIEND_COLLECTION,
      friendId,
      userFriendConverter,
    ).get().then(parseData);

    if (friendship === null || friendship.status !== 'accepted') {
      throw new HttpsError('permission-denied', 'You are not friends with that account.');
    }

    const compatibilityRef = getDocumentRef(
      FRIEND_COMPATIBILITY_COLLECTION,
      friendCompatibilityId(userId, friendId),
      friendCompatibilityConverter,
    );

    const today = dailyQuestionDateKey(new Date());
    const cached = await compatibilityRef.get().then(parseData);

    if (cached !== null && cached.computed_on === today) {
      return resultOf(cached);
    }

    const tally = await compatibilityBetween(userId, friendId);

    const compatibility: FriendCompatibilityData = {
      // Sorted, like the id this document is written under — the rules read
      // membership off this field, a rule having no way to split that id.
      user_ids: [ userId, friendId ].sort(),
      ...tally,
      computed_on: today,
      computed_at: new Date().toISOString(),
    };

    // `set` rather than `update`: the document is rebuilt whole every time, and
    // the first computation of a pair has nothing to update. A race between the
    // two friends opening the profile at the same second writes the same three
    // numbers twice, which is why this is not worth a transaction.
    await compatibilityRef.set(compatibility);

    return resultOf(compatibility);
  },
);
