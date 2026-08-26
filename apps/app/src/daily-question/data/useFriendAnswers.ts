import {
  DAILY_QUESTION_ANSWER_COLLECTION,
  QUESTION_COLLECTION,
  dailyQuestionAnswerConverter,
} from '@statowrel/models';
import { useEffect, useMemo, useState } from 'react';

import { useFriends } from '@/friends/data/useFriends';
import { getFrozenDoc, getSubDocumentRef } from '@/lib/firestore';

/** One accepted friend and what they answered that day — `null` while they haven't. */
export interface FriendAnswer {
  friendId: string;
  /** The friend's handle — what the row shows, and what seeds their generated avatar. */
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

/** What one friend picked, or `null` for a friend who hasn't answered. */
type Picked = Record<string, { optionId: string; answeredAt: string } | null>;

interface AnswersState {
  key: string;
  picked: Picked;
  failed: boolean;
}

/**
 * The friends' answers of docs/prd.md §4.5, for one day's question: every
 * accepted friend, what they picked and when — or nothing for a friend who
 * hasn't answered yet.
 *
 * **`enabled` is the BeReal mechanic**, not an optimisation: a friend's answer
 * is unlocked by having answered oneself, so the screen passes `false` until its
 * own answer exists and no answer is read before then.
 *
 * The friend list is not read here — `useFriends` already subscribes to
 * `v1_users/{uid}/v1_user_friends` for the Menu screen's list, and that entry
 * carries everything a row shows (the handle, which also seeds the generated
 * avatar). This hook adds the one thing it doesn't: one `get` per friend on
 * `v1_questions/{question_id}/v1_daily_question_answers/{friend_id}`. The
 * document id being the answering user's UID is what makes that a read rather
 * than a query — a collection-group query is deliberately impossible, since the
 * rules only ever let one group-query one's **own** answers
 * (`firestore.rules`), so a friend's answer stays scoped to the one question —
 * one question is one day — and nobody gets a friend's history.
 *
 * Those reads are one-shot. A friend answering while the sheet is open is worth
 * one stale line rather than a listener per friend: the result is reopenable at
 * will (docs/prd.md §5.5), and the next open is what shows the answers arrived
 * since.
 */
export const useFriendAnswers = (questionId: string | null, enabled: boolean): FriendAnswersView => {
  const { accepted, loading } = useFriends();

  const friendIds = useMemo(
    () => accepted.map((friendship) => friendship.friend_id),
    [ accepted ],
  );

  const [ state, setState ] = useState<AnswersState | null>(null);

  // The key carries what the state describes — the day and the friends it was
  // read for — so a slice belonging to the previous one is simply not current.
  // Same shape `useDailyQuestion` uses, rather than resetting state on the way
  // into the effect.
  const key = `${questionId ?? ''}:${friendIds.join(',')}`;

  useEffect(() => {
    if (!enabled || questionId === null || friendIds.length === 0) {
      return undefined;
    }

    let cancelled = false;

    // `getFrozenDoc` rather than `getDoc`, and the distinction it draws is
    // exactly the one this list needs: an answer that exists is immutable — the
    // rules deny every update to one — so a friend already found to have
    // answered is served from the SDK's disk cache, for good, across relaunches.
    // A friend who has *not* answered reads as an absence, which `getFrozenDoc`
    // never trusts, so they are re-read from the server every time. Reopening a
    // spent day therefore converges on costing nothing, while today's sheet
    // still picks up whoever answered since it was last opened.
    Promise.all(friendIds.map((friendId) => getFrozenDoc(getSubDocumentRef(
      QUESTION_COLLECTION,
      questionId,
      DAILY_QUESTION_ANSWER_COLLECTION,
      friendId,
      dailyQuestionAnswerConverter,
    ))))
      .then((snapshots) => {
        if (cancelled) {
          return;
        }

        const picked: Picked = {};

        friendIds.forEach((friendId, index) => {
          const answer = snapshots[index].data() ?? null;

          picked[friendId] = answer === null
            ? null
            : { optionId: answer.option_id, answeredAt: answer.answered_at };
        });

        setState({ key, picked, failed: false });
      })
      .catch((error: unknown) => {
        console.warn('[daily-question] could not load the friends\' answers', questionId, error);

        if (!cancelled) {
          setState({ key, picked: {}, failed: true });
        }
      });

    return () => {
      cancelled = true;
    };
    // `key` is the day and its friends, joined — a re-render handing over the
    // same ones must not restart the reads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ enabled, questionId, key ]);

  const current = state?.key === key ? state : null;

  const friends = useMemo(() => accepted.map((friendship) => {
    const answer = current?.picked[friendship.friend_id] ?? null;

    return {
      friendId: friendship.friend_id,
      username: friendship.friend_username,
      optionId: answer?.optionId ?? null,
      answeredAt: answer?.answeredAt ?? null,
    };
  }), [ accepted, current ]);

  if (!enabled) {
    return { status: 'idle', friends: [] };
  }

  if (current?.failed === true) {
    return { status: 'error', friends: [] };
  }

  // Loading until the list has landed *and* the answers have been read for it —
  // a friend shown as « n'a pas encore répondu » before their answer is read
  // would be a lie the next render takes back.
  if (loading || (friendIds.length > 0 && current === null)) {
    return { status: 'loading', friends: [] };
  }

  return { status: 'ready', friends };
};
