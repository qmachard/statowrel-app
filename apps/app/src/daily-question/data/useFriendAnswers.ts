import {
  DAILY_QUESTION_ANSWER_COLLECTION,
  QUESTION_COLLECTION,
  USER_COLLECTION,
  USER_FRIEND_COLLECTION,
  dailyQuestionAnswerConverter,
  userFriendConverter,
} from '@statowrel/models';
import { getDoc, getDocs, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { useAuth } from '@/auth/AuthContext';
import { getSubCollectionRef, getSubDocumentRef } from '@/lib/firestore';

/** One accepted friend and what they answered that day — `null` while they haven't. */
export interface FriendAnswer {
  friendId: string;
  username: string;
  /** `QuestionOptionData.id` of what they picked, `null` for a friend who hasn't answered. */
  optionId: string | null;
  answeredAt: string | null;
}

export type FriendAnswersStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface FriendAnswersView {
  /** `idle` until the day is one's own to look at — see `enabled` below. */
  status: FriendAnswersStatus;
  friends: FriendAnswer[];
}

interface FriendAnswersState {
  key: string;
  status: FriendAnswersStatus;
  friends: FriendAnswer[];
}

/**
 * The friends' answers of docs/prd.md §4.5, for one day's question: every
 * accepted friend, with what they picked and when, or nothing for a friend who
 * hasn't answered yet.
 *
 * **`enabled` is the BeReal mechanic**, not an optimisation: a friend's answer
 * is unlocked by having answered oneself, so the screen passes `false` until
 * its own answer exists and nothing is read before then.
 *
 * Two reads, both one-shot:
 *
 * - `v1_users/{uid}/v1_user_friends` filtered on `accepted` — the owner's own
 *   list, the only place the app can learn who is friends with whom, and the
 *   `friend_username` it carries is what spares one profile read per line.
 * - one `get` per friend on
 *   `v1_questions/{question_id}/v1_daily_question_answers/{friend_id}` — the
 *   document id being the answering user's UID is what makes this a read rather
 *   than a query. Deliberately **not** a collection-group query: the rules only
 *   ever let one group-query one's own answers (see `firestore.rules`), so
 *   reading a friend's stays scoped to the one question — one question is one
 *   day, and nobody gets a friend's history.
 *
 * Neither is subscribed to. The list barely moves, and a friend answering while
 * the sheet is open is worth one stale line rather than a listener per friend:
 * the card is reopenable at will (docs/prd.md §5.5) and the next open is what
 * shows the answers arrived since.
 */
export const useFriendAnswers = (questionId: string | null, enabled: boolean): FriendAnswersView => {
  const { user } = useAuth();
  const userId = user?.uid ?? null;

  const [ state, setState ] = useState<FriendAnswersState | null>(null);

  // The key carries what the state describes, so a slice belonging to the
  // previous day is simply not current — the same shape `useDailyQuestion` uses
  // rather than resetting state on the way into the effect.
  const key = `${questionId ?? ''}:${userId ?? ''}`;

  useEffect(() => {
    if (!enabled || userId === null || questionId === null) {
      return undefined;
    }

    let cancelled = false;

    const load = async (): Promise<FriendAnswer[]> => {
      const friends = await getDocs(query(
        getSubCollectionRef(USER_COLLECTION, userId, USER_FRIEND_COLLECTION, userFriendConverter),
        where('status', '==', 'accepted'),
      ));

      const entries = friends.docs.map((document) => document.data());

      const answers = await Promise.all(entries.map((friend) => getDoc(getSubDocumentRef(
        QUESTION_COLLECTION,
        questionId,
        DAILY_QUESTION_ANSWER_COLLECTION,
        friend.friend_id,
        dailyQuestionAnswerConverter,
      ))));

      return entries.map((friend, index) => {
        const answer = answers[index].data() ?? null;

        return {
          friendId: friend.friend_id,
          username: friend.friend_username,
          optionId: answer?.option_id ?? null,
          answeredAt: answer?.answered_at ?? null,
        };
      });
    };

    load()
      .then((friends) => {
        if (!cancelled) {
          setState({ key, status: 'ready', friends });
        }
      })
      .catch((error: unknown) => {
        console.warn('[daily-question] could not load the friends\' answers', questionId, error);

        if (!cancelled) {
          setState({ key, status: 'error', friends: [] });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [ enabled, userId, questionId, key ]);

  const current = state?.key === key ? state : null;

  if (!enabled) {
    return { status: 'idle', friends: [] };
  }

  return { status: current?.status ?? 'loading', friends: current?.friends ?? [] };
};
