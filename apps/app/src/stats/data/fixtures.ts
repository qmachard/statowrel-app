import type { DailyQuestionAnswerData, DailyQuestionData, QuestionData, UserData } from '@statowrel/models';

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
  /** The question broadcast today, `null` on a day without one (docs/prd.md §5.2). */
  dailyQuestion: DailyQuestionData | null;
  /** The `v1_questions` document `dailyQuestion` points at — its label is what the banner announces. */
  question: QuestionData | null;
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

type UserFixtureInput = Pick<UserData, 'username' | 'streak_count' | 'streak_best' | 'streak_last_answered_on'>;

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

/** The question of the example in docs/prd.md §6 — the one the accent banner announces. */
const QUESTION_ID = 'fixture-question';

const TODAY_QUESTION: QuestionData = {
  label: 'Ton dentifrice, tu le presses…',
  options: [
    { id: OPTION_IDS[0], label: 'Par le bout', stat_label: 'méthodique' },
    { id: OPTION_IDS[1], label: 'Au milieu', stat_label: 'sauvage' },
    { id: OPTION_IDS[2], label: 'Je l’écrase n’importe comment', stat_label: 'anarchiste' },
  ],
  status: 'used',
  author_id: USER_ID,
  rejection_reason: null,
  broadcast_at: new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate(), 7, 0).toISOString(),
  created_at: addDays(TODAY, -HISTORY_DAYS).toISOString(),
};

// Published at 07:00 and closing at Paris midnight — the window of docs/prd.md §4.2.
const TODAY_DAILY_QUESTION: DailyQuestionData = {
  date: toDateKey(TODAY),
  question_id: QUESTION_ID,
  published_at: new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate(), 7, 0).toISOString(),
  closes_at: addDays(TODAY, 1).toISOString(),
  answer_counts: {
    [OPTION_IDS[0]]: 412,
    [OPTION_IDS[1]]: 189,
    [OPTION_IDS[2]]: 57,
  },
};

export const STATS_FIXTURES: StatsFixture[] = [
  {
    id: 'streak-ongoing',
    label: 'Streak en cours',
    user: buildUser({
      username: 'lou',
      streak_count: 12,
      streak_best: 34,
      streak_last_answered_on: toDateKey(TODAY),
    }),
    answers: ONGOING_OFFSETS.map(buildAnswer),
    dailyQuestion: TODAY_DAILY_QUESTION,
    question: TODAY_QUESTION,
  },
  {
    id: 'streak-lost',
    label: 'Streak perdu',
    user: buildUser({
      username: 'lou',
      streak_count: 0,
      streak_best: 21,
      streak_last_answered_on: toDateKey(addDays(TODAY, -3)),
    }),
    answers: LOST_OFFSETS.map(buildAnswer),
    dailyQuestion: TODAY_DAILY_QUESTION,
    question: TODAY_QUESTION,
  },
];
