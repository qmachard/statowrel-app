import {
  type DailyQuestionAnswerData,
  type UserCalendarMonthDayData,
  monthDayKeyOf,
  monthKeyOf,
} from '@statowrel/models';

import { invalidateCalendarMonth } from '@/stats/data/calendarCache';

/**
 * The answers written during this app session — the one thing the Stats screen
 * cannot read back in time.
 *
 * Everything an answer changes on that screen — the streak counters, the
 * calendar cell, the banner — is written by the **answer trigger**, a beat
 * after the app writes the answer. The calendar is no longer subscribed to (see
 * `useStatsData`), so a refresh fired the moment the sheet closes can perfectly
 * well come back from Firestore *before* the trigger has run. Until it has,
 * this is what the day is: the app knows it wrote the answer, and says so.
 *
 * Two things happen when an answer lands here. The month it belongs to is
 * **dropped from the calendar cache**, so the next read of it is a real one
 * rather than a copy taken before the answer existed; and the day is kept as
 * the calendar's own projection of it, which `useStatsData` lays over the month
 * it read. Once the trigger catches up the two agree and the overlay becomes a
 * no-op.
 *
 * The question sheet needs none of this — it subscribes to the answer document
 * itself, and Firestore hands a local write to its own listeners before the
 * round trip.
 *
 * A session-lifetime map rather than a re-read, because an answer is written
 * once and never updated (docs/prd.md §4.2): what `setDoc` was handed *is* what
 * Firestore holds.
 */
interface SessionAnswer {
  answer: DailyQuestionAnswerData;
  /** The same day as the answer trigger will project it, so the overlay and the document have one shape. */
  day: UserCalendarMonthDayData;
}

const answers = new Map<string, SessionAnswer>();
const listeners = new Set<() => void>();
// Bumped on every write, so a consumer can subscribe to "an answer landed"
// through `useSyncExternalStore` without a snapshot it has to keep identical.
let version = 0;

const keyOf = (userId: string, date: string) => `${userId}:${date}`;

/**
 * Records the answer this session just wrote.
 *
 * `statLabel` is the picked option's own — copied here for the same reason the
 * answer trigger copies it into the month: the calendar renders the label of an
 * answered day, and reading it back would mean fetching the question again.
 */
export const rememberAnswer = (answer: DailyQuestionAnswerData, statLabel: string): void => {
  answers.set(keyOf(answer.user_id, answer.date), {
    answer,
    day: { option_id: answer.option_id, stat_label: statLabel, late: answer.late },
  });

  invalidateCalendarMonth(answer.user_id, monthKeyOf(answer.date));

  version += 1;
  listeners.forEach((listener) => listener());
};

export const subscribeToAnswers = (listener: () => void): (() => void) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

/** How many answers this session has written — the snapshot `useSyncExternalStore` reads. */
export const getAnswersVersion = (): number => version;

/**
 * The stored answer, or `null` — the same reference for as long as it is
 * stored, which is what `useSyncExternalStore` needs from a snapshot.
 */
export const readAnswer = (userId: string | null, date: string): DailyQuestionAnswerData | null => (
  userId === null ? null : answers.get(keyOf(userId, date))?.answer ?? null
);

/**
 * The days of `monthKey` this session answered, keyed the way a calendar month
 * keys its own — ready to be merged over the `answered` half of a month read
 * before the trigger caught up.
 */
export const readAnswerDays = (
  userId: string | null,
  monthKey: string,
): Record<string, UserCalendarMonthDayData> => {
  if (userId === null) {
    return {};
  }

  return [ ...answers.values() ].reduce<Record<string, UserCalendarMonthDayData>>((days, stored) => {
    if (stored.answer.user_id === userId && monthKeyOf(stored.answer.date) === monthKey) {
      days[monthDayKeyOf(stored.answer.date)] = stored.day;
    }

    return days;
  }, {});
};
