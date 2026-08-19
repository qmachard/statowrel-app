import type { DailyQuestionAnswerData, UserData } from '@statowrel/models';

import { addDays, startOfDay, toDateKey } from '@/lib/dates';

/**
 * Fake Stats data, typed on the real models.
 *
 * Nothing here is pre-chewed for the screen: the components consume `UserData`
 * and `DailyQuestionAnswerData` exactly as Firestore will hand them over — a
 * `v1_users/{uid}` read plus the calendar's collection-group query on
 * `v1_daily_question_answers` (docs/prd.md §6). Wiring the real source in
 * replaces this file and `useStatsData`, and nothing else.
 *
 * Two sets, because the streak block and the calendar look nothing alike at 12
 * days and at 0 (docs/prd.md §4.6) — `DevFixtureSwitch` flips between them.
 */
export type StatsFixtureId = 'streak-ongoing' | 'streak-lost';

export interface StatsFixture {
  id: StatsFixtureId;
  label: string;
  user: UserData;
  answers: DailyQuestionAnswerData[];
}

const USER_ID = 'fixture-user';

/** How far back the fake account goes — also the calendar's lower navigation bound. */
const HISTORY_DAYS = 130;

// Option ULIDs lifted from the PRD's example question (docs/prd.md §6), cycled
// through so answers carry plausible ids rather than one repeated value.
const OPTION_IDS = [
  '01JBQZ8K3M4N5P6Q7R8S9T0V1W',
  '01JBQZ8K3M4N5P6Q7R8S9T0V2X',
  '01JBQZ8K3M4N5P6Q7R8S9T0V3Y',
];

// Anchored once at module load: every offset below is a number of days before
// today, so the calendar stays populated whenever the app is opened.
const TODAY = startOfDay(new Date());

const range = (from: number, until: number) => Array.from({ length: until - from }, (_, index) => from + index);

/** History with a hole every fifth day — deterministic, so a re-render never reshuffles the calendar. */
const historyOffsets = (from: number, until: number) => range(from, until).filter((offset) => offset % 5 !== 3);

const buildAnswer = (offset: number, index: number): DailyQuestionAnswerData => {
  const day = addDays(TODAY, -offset);

  return {
    user_id: USER_ID,
    date: toDateKey(day),
    option_id: OPTION_IDS[index % OPTION_IDS.length],
    // 19:12 local — the answer lands on the evening of its own day.
    answered_at: new Date(day.getFullYear(), day.getMonth(), day.getDate(), 19, 12).toISOString(),
    // Catch-up answers (docs/prd.md §4.2) only exist deep in the history.
    late: offset > 60,
  };
};

type UserFixtureInput = Pick<UserData, 'display_name' | 'streak_count' | 'streak_best' | 'streak_last_answered_on'>;

const buildUser = (user: UserFixtureInput): UserData => ({
  photo_url: null,
  email: 'lou@statowrel.app',
  auth_providers: [ 'google.com' ],
  created_at: addDays(TODAY, -HISTORY_DAYS).toISOString(),
  updated_at: TODAY.toISOString(),
  ...user,
});

// 12 unbroken days up to today, then a two-day hole, then the older history.
const ONGOING_OFFSETS = [ ...range(0, 12), ...historyOffsets(13, HISTORY_DAYS) ];

// Same history, but the last three days are missed — the streak is dead.
const LOST_OFFSETS = [ ...range(3, 12), ...historyOffsets(13, HISTORY_DAYS) ];

export const STATS_FIXTURES: StatsFixture[] = [
  {
    id: 'streak-ongoing',
    label: 'Streak en cours',
    user: buildUser({
      display_name: 'Lou',
      streak_count: 12,
      streak_best: 34,
      streak_last_answered_on: toDateKey(TODAY),
    }),
    answers: ONGOING_OFFSETS.map(buildAnswer),
  },
  {
    id: 'streak-lost',
    label: 'Streak perdu',
    user: buildUser({
      display_name: 'Lou',
      streak_count: 0,
      streak_best: 21,
      streak_last_answered_on: toDateKey(addDays(TODAY, -3)),
    }),
    answers: LOST_OFFSETS.map(buildAnswer),
  },
];
