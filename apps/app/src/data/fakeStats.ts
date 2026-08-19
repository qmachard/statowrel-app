import type { DailyQuestionAnswerData, UserData } from '@statowrel/models';

import { toDayKey } from '@/lib/calendar';

/**
 * Placeholder data for the Stats screen (docs/prd.md §5.2).
 *
 * Typed against the real `@statowrel/models` shapes so wiring the screen to
 * Firestore later is a swap of the source, not a rewrite of the components.
 * Everything is generated relative to today, so the screen keeps showing a
 * live-looking history whatever day it is run.
 */

/** How far back the fake history goes — the account's sign-up date. */
const HISTORY_DAYS = 88;

const BEST_STREAK = 47;

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

export interface StatsScenario {
  user: UserData;
  answers: DailyQuestionAnswerData[];
  /** `stat_label` per answered day — belongs to the day's card, faked here until that model exists. */
  statLabels: Record<string, string>;
  answeredCount: number;
  signUpDate: Date;
}

function daysAgo(offset: number): Date {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - offset);

  return date;
}

/**
 * Builds a scenario from the days that were missed.
 *
 * Offset 0 (today) is never answered — the screen must always show the
 * "à répondre" state — so the current streak is simply the run of answered days
 * ending yesterday.
 */
function buildScenario(missedOffsets: Set<number>, lateOffsets: Set<number>): StatsScenario {
  const signUpDate = daysAgo(HISTORY_DAYS);

  const answers: DailyQuestionAnswerData[] = Array.from(
    { length: HISTORY_DAYS },
    (_, index) => index + 1,
  )
    .filter((offset) => !missedOffsets.has(offset))
    .map((offset) => {
      const date = daysAgo(offset);

      return {
        user_id: FAKE_USER_ID,
        date: toDayKey(date),
        option_id: `option-${offset % 3}`,
        answered_at: date.toISOString(),
        late: lateOffsets.has(offset),
      };
    });

  let streakCount = 0;
  while (!missedOffsets.has(streakCount + 1) && streakCount < HISTORY_DAYS) {
    streakCount += 1;
  }

  // A late answer completes the calendar but never restores the streak
  // (docs/prd.md §4.6), so the streak's anchor is the last on-time answer.
  const lastOnTime = answers.find((answer) => !answer.late) ?? null;

  return {
    user: {
      display_name: 'Quentin',
      photo_url: null,
      created_at: signUpDate.toISOString(),
      updated_at: new Date().toISOString(),
      streak_count: streakCount,
      streak_best: BEST_STREAK,
      streak_last_answered_on: lastOnTime?.date ?? null,
    },
    answers,
    statLabels: Object.fromEntries(
      answers.map((answer, index) => [answer.date, STAT_LABELS[index % STAT_LABELS.length]]),
    ),
    answeredCount: answers.length,
    signUpDate,
  };
}

/** The nominal case: twelve days in a row, today still to answer. */
export const runningStreakScenario: StatsScenario = buildScenario(
  new Set([13, 14, 21, 27, 28, 34, 41, 55, 56, 57, 70]),
  new Set([19, 33, 48, 62]),
);

/** The broken case: the last three days were missed, so the streak is back to 0. */
export const brokenStreakScenario: StatsScenario = buildScenario(
  new Set([1, 2, 3, 11, 12, 19, 25, 26, 32, 39, 53, 54, 68]),
  new Set([4, 17, 31, 46, 60]),
);
