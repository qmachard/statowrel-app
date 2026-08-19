import type { DailyQuestionAnswerData } from '@statowrel/models';

/**
 * The answers written during this app session, so every screen showing a day
 * agrees on it the instant it is answered.
 *
 * Two of them show the same day at the same time: the question sheet the answer
 * is given on, and the Stats screen under it, whose banner announces today's
 * question until it has been answered (docs/prd.md §5.2). They each read the
 * day through their own `useDailyQuestion`, so without this the banner would go
 * on inviting the user to a question they have just answered until the screen
 * remounts.
 *
 * A session-lifetime map rather than a re-read, because an answer is written
 * once and never updated (docs/prd.md §4.2): what `setDoc` was handed *is* what
 * Firestore holds, and asking for it back would cost a round trip to learn
 * nothing.
 */
const answers = new Map<string, DailyQuestionAnswerData>();
const listeners = new Set<() => void>();

const keyOf = (userId: string, date: string) => `${userId}:${date}`;

/**
 * Set by an answer, cleared by whoever acts on it: the counters on
 * `v1_users/{uid}` — streak, record, answered days — are moved by the answer
 * trigger, so the copy `AuthContext` holds is stale from here until the Stats
 * screen re-reads it.
 *
 * A flag rather than an unconditional refresh on focus, because that document
 * is otherwise free: it is read once at sign-in and changes at most once a day.
 */
let profileStale = false;

export const rememberAnswer = (answer: DailyQuestionAnswerData): void => {
  answers.set(keyOf(answer.user_id, answer.date), answer);
  profileStale = true;
  listeners.forEach((listener) => listener());
};

/** True once per answer — the caller is expected to re-read the profile. */
export const consumeStaleProfile = (): boolean => {
  const was = profileStale;

  profileStale = false;

  return was;
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
