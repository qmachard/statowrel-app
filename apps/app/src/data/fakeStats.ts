import type { DailyQuestionAnswerData, UserData } from '@statowrel/models';

import { toDayKey } from '@/lib/calendar';

/**
 * Placeholder data for the Stats screen (docs/prd.md §5.2).
 *
 * Typed against the real `@statowrel/models` shapes so wiring the screen to
 * Firestore later is a swap of the source, not a rewrite of the components.
 * Everything here is generated relative to today so the screen keeps showing a
 * live-looking streak whatever day it is run.
 */

const CURRENT_STREAK = 12;
const BEST_STREAK = 47;

/** Days before today that have no answer — the "raté" cells of the grid. */
const MISSED_OFFSETS = new Set([13, 14, 21, 27, 28, 34, 41, 55, 56, 57, 70]);

/** Days answered after their day closed — completed, but they never restored the streak. */
const LATE_OFFSETS = new Set([19, 33, 48, 62]);

/** How far back the fake history goes — the account's sign-up date. */
const HISTORY_DAYS = 88;

const FAKE_USER_ID = 'fake-user';

const STAT_LABELS = [
  '68% comme toi',
  'La moitié',
  '1 sur 5',
  'Ultra minoritaire',
  'Presque tous',
  '3 sur 4',
  'Pile 50/50',
  'Le camp du oui',
];

function daysAgo(offset: number): Date {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - offset);

  return date;
}

export const fakeSignUpDate: Date = daysAgo(HISTORY_DAYS);

export const fakeUser: UserData = {
  display_name: 'Quentin',
  photo_url: null,
  created_at: fakeSignUpDate.toISOString(),
  updated_at: new Date().toISOString(),
  streak_count: CURRENT_STREAK,
  streak_best: BEST_STREAK,
  // Today is not answered yet, so the streak is anchored on yesterday.
  streak_last_answered_on: toDayKey(daysAgo(1)),
};

/**
 * One answer per day over the fake history, minus the missed offsets. Offset 0
 * (today) is deliberately absent: the screen must show the "à répondre" state.
 */
export const fakeAnswers: DailyQuestionAnswerData[] = Array.from(
  { length: HISTORY_DAYS },
  (_, index) => index + 1,
)
  .filter((offset) => !MISSED_OFFSETS.has(offset))
  .map((offset) => {
    const date = daysAgo(offset);

    return {
      user_id: FAKE_USER_ID,
      date: toDayKey(date),
      option_id: `option-${offset % 3}`,
      answered_at: date.toISOString(),
      late: LATE_OFFSETS.has(offset),
    };
  });

/**
 * `stat_label` shown inside an answered cell (docs/prd.md §5.2). Belongs to the
 * day's card, not to the answer — faked here until the card model exists.
 */
export const fakeStatLabels: Record<string, string> = Object.fromEntries(
  fakeAnswers.map((answer, index) => [answer.date, STAT_LABELS[index % STAT_LABELS.length]]),
);

/** Total answered days, shown next to the streaks. */
export const fakeAnsweredCount: number = fakeAnswers.length;
