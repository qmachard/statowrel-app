import { useState } from 'react';

import { STATS_FIXTURES, type StatsFixture, type StatsFixtureId } from './fixtures';

/**
 * Where the Stats screen gets its data — fake, for now.
 *
 * Replacing it with Firestore is a change to this hook alone: read
 * `v1_users/{uid}` for the `UserData` and run the calendar's collection-group
 * query for the answers (docs/prd.md §6), and return the same `{ user, answers }`.
 * The `fixtureId` plumbing exists only to flip between the two states in
 * development and leaves with the fixtures.
 */
export const useStatsData = () => {
  const [ fixtureId, selectFixture ] = useState<StatsFixtureId>('streak-ongoing');
  const fixture: StatsFixture = STATS_FIXTURES.find((candidate) => candidate.id === fixtureId) ?? STATS_FIXTURES[0];

  return {
    user: fixture.user,
    answers: fixture.answers,
    fixtures: STATS_FIXTURES,
    fixtureId,
    selectFixture,
  };
};
