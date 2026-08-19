import { useState } from 'react';

import { STATS_FIXTURES, type StatsFixture, type StatsFixtureId } from './fixtures';

/**
 * Where the Stats screen gets its data — fake, for now.
 *
 * Replacing it with Firestore is a change to this hook alone: read
 * `v1_users/{uid}` for the `UserData`, run the calendar's collection-group query
 * for the answers, read `v1_daily_questions/{today}` and the `v1_questions`
 * document it points at (docs/prd.md §6), and return the same shape.
 * The `fixtureId` plumbing exists only to flip between the two states in
 * development and leaves with the fixtures.
 */
export const useStatsData = () => {
  const [ fixtureId, selectFixture ] = useState<StatsFixtureId>('question-open');
  const fixture: StatsFixture = STATS_FIXTURES.find((candidate) => candidate.id === fixtureId) ?? STATS_FIXTURES[0];

  return {
    user: fixture.user,
    answers: fixture.answers,
    dailyQuestion: fixture.dailyQuestion,
    question: fixture.question,
    fixtures: STATS_FIXTURES,
    fixtureId,
    selectFixture,
  };
};
