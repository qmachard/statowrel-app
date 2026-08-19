import type { DailyQuestionAnswerData, UserData } from '@statowrel/models';

import { startOfDay, toDayKey } from './calendar';

/**
 * Fake data for the home screen, typed on the real models.
 *
 * Nothing here is a placeholder shape: `UserData` and `DailyQuestionAnswerData`
 * are the documents Firestore will hand back, so wiring the real queries in
 * `useHomeStats` is a change of source, not a rewrite of the screen.
 *
 * Everything is anchored on "today" rather than on fixed dates, so the calendar
 * keeps showing a live-looking month whatever day the app is opened.
 */
export interface HomeStats {
  user: UserData;
  /** The current user's answers, the same slice the calendar query will return. */
  answers: DailyQuestionAnswerData[];
}

export type HomeDataset = 'running' | 'lost';

const FIXTURE_USER_ID = 'fixture-user-uid';

/** Four option ids, in the ULID format the real questions use (docs/prd.md §6). */
const OPTION_IDS = [
  '01JBQZ8K3M4N5P6Q7R8S9T0V1W',
  '01JBQZ8K3M4N5P6Q7R8S9T0V2X',
  '01JBQZ8K3M4N5P6Q7R8S9T0V3Y',
  '01JBQZ8K3M4N5P6Q7R8S9T0V4Z',
];

const SIGNUP_DAYS_AGO = 118;

const daysAgo = (offset: number): Date => {
  const today = startOfDay(new Date());

  return new Date(today.getFullYear(), today.getMonth(), today.getDate() - offset);
};

/**
 * A day the user let slip, decided from the offset alone so the fixture is the
 * same on every render — a random draw would reshuffle the calendar on each
 * re-render and make the two datasets impossible to compare.
 */
const isScatteredMiss = (offset: number): boolean => offset % 9 === 0 || offset % 13 === 0;

const buildAnswer = (offset: number): DailyQuestionAnswerData => {
  const day = daysAgo(offset);
  // Published at a random hour between 8am and 8pm (docs/prd.md §4.2), so the
  // answers land spread across the day rather than all at the same minute.
  const answeredAt = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 8 + (offset % 12), (offset * 7) % 60);

  return {
    user_id: FIXTURE_USER_ID,
    date: toDayKey(day),
    option_id: OPTION_IDS[offset % OPTION_IDS.length],
    answered_at: answeredAt.toISOString(),
    // A catch-up answer completes the calendar without restoring the streak
    // (docs/prd.md §4.2) — a few of them keep the flag exercised.
    late: offset > 30 && offset % 17 === 0,
  };
};

const buildAnswers = (offsets: number[]): DailyQuestionAnswerData[] => (
  offsets.map(buildAnswer).sort((a, b) => a.date.localeCompare(b.date))
);

const range = (from: number, to: number): number[] => (
  Array.from({ length: to - from + 1 }, (_unused, index) => from + index)
);

const buildUser = (overrides: Pick<UserData, 'streak_count' | 'streak_best' | 'streak_last_answered_on'>): UserData => ({
  display_name: 'Camille',
  photo_url: null,
  email: 'camille@statowrel.app',
  auth_providers: [ 'google.com' ],
  created_at: daysAgo(SIGNUP_DAYS_AGO).toISOString(),
  updated_at: daysAgo(0).toISOString(),
  ...overrides,
});

/**
 * Streak running: answered every day for the last twelve, today still open.
 *
 * The gaps are load-bearing. Day 13 is missing, which is what makes
 * `streak_count: 12` true of the answers rather than just asserted next to
 * them; days 14 to 40 form an unbroken run of 27, closed by a miss on day 41,
 * which is what makes `streak_best: 27` equally true. The scattered tail never
 * runs longer than eight days, so it cannot beat either.
 */
const RUNNING_OFFSETS = [
  ...range(1, 12),
  ...range(14, 40),
  ...range(42, SIGNUP_DAYS_AGO).filter((offset) => !isScatteredMiss(offset)),
];

/**
 * Streak lost: nothing since six days ago, so the last five days read as missed.
 *
 * Days 6 to 26 are the unbroken run behind `streak_best: 21`, and day 27 is the
 * miss that closes it.
 */
const LOST_OFFSETS = [
  ...range(6, 26),
  ...range(28, SIGNUP_DAYS_AGO).filter((offset) => !isScatteredMiss(offset)),
];

export const HOME_FIXTURES: Record<HomeDataset, HomeStats> = {
  running: {
    user: buildUser({
      streak_count: 12,
      streak_best: 27,
      streak_last_answered_on: toDayKey(daysAgo(1)),
    }),
    answers: buildAnswers(RUNNING_OFFSETS),
  },
  lost: {
    user: buildUser({
      streak_count: 0,
      streak_best: 21,
      streak_last_answered_on: toDayKey(daysAgo(6)),
    }),
    answers: buildAnswers(LOST_OFFSETS),
  },
};

export const HOME_DATASET_LABELS: Record<HomeDataset, string> = {
  running: 'Streak en cours',
  lost: 'Streak perdu',
};
