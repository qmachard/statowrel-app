import type { DailyQuestionAnswerData } from '@statowrel/models';

/**
 * The answers written during this app session — the one thing a subscription
 * cannot give the Stats screen in time.
 *
 * Everything else on that screen is live: the profile counters come from
 * `AuthContext`'s subscription, the calendar month from `useStatsData`'s. But
 * both are written by the **answer trigger**, a beat after the app writes the
 * answer, and the banner has to fall on the tap rather than on the trigger. So
 * the answer this session wrote counts on its own until the projection catches
 * up, at which point the two agree and this becomes redundant.
 *
 * The question sheet needs none of this — it subscribes to the answer document
 * itself, and Firestore hands a local write to its own listeners before the
 * round trip.
 *
 * A session-lifetime map rather than a re-read, because an answer is written
 * once and never updated (docs/prd.md §4.2): what `setDoc` was handed *is* what
 * Firestore holds.
 */
const answers = new Map<string, DailyQuestionAnswerData>();
const listeners = new Set<() => void>();

const keyOf = (userId: string, date: string) => `${userId}:${date}`;

export const rememberAnswer = (answer: DailyQuestionAnswerData): void => {
  answers.set(keyOf(answer.user_id, answer.date), answer);
  listeners.forEach((listener) => listener());
};

export const subscribeToAnswers = (listener: () => void): (() => void) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

/**
 * The stored answer, or `null` — the same reference for as long as it is
 * stored, which is what `useSyncExternalStore` needs from a snapshot.
 */
export const readAnswer = (userId: string | null, date: string): DailyQuestionAnswerData | null => (
  userId === null ? null : answers.get(keyOf(userId, date)) ?? null
);
