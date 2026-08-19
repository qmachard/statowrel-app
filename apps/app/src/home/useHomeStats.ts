import { useMemo, useState } from 'react';

import type { DailyQuestionAnswerData, UserData } from '@statowrel/models';

import { startOfDay } from './calendar';
import { HOME_FIXTURES, type HomeDataset } from './fixtures';

export interface HomeStatsResult {
  user: UserData;
  /** The current user's answers — one month at a time once this reads Firestore. */
  answers: DailyQuestionAnswerData[];
  /** Everything before it is inert on the calendar (docs/prd.md §5.2). */
  signupDate: Date;
  today: Date;
  answeredDaysCount: number;
  dataset: HomeDataset;
  selectDataset: (dataset: HomeDataset) => void;
}

/**
 * The screen's single data source.
 *
 * It serves fixtures today and will serve `v1_users/{uid}` plus the calendar's
 * collection-group query on `v1_daily_question_answers` (docs/prd.md §6)
 * tomorrow. Everything above it already reads the real model types, so that
 * swap stays inside this file — `dataset` / `selectDataset` are the only two
 * members that go away with the fixtures.
 */
export const useHomeStats = (): HomeStatsResult => {
  const [ dataset, selectDataset ] = useState<HomeDataset>('running');

  const { user, answers } = HOME_FIXTURES[dataset];

  // Pinned once per mount: recomputing it on every render would make "today"
  // move under the user's feet in a session left open across midnight, and the
  // calendar re-render for nothing.
  const today = useMemo(() => startOfDay(new Date()), []);
  const signupDate = useMemo(() => startOfDay(new Date(user.created_at)), [ user.created_at ]);

  return {
    user,
    answers,
    signupDate,
    today,
    answeredDaysCount: answers.length,
    dataset,
    selectDataset,
  };
};
