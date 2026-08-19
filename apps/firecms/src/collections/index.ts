import { EntityCollectionsBuilder } from 'firecms';

import dailyQuestionMonthsCollection from './v1_daily_question_months';
import dailyQuestionsCollection from './v1_daily_questions';
import buildQuestionsCollection from './v1_questions';
import usersCollection from './v1_users';

// Add one collection file per `v1_*` Firestore collection here as the data
// model is designed, then list it below. See CLAUDE.md for the pattern.
const collections: EntityCollectionsBuilder = ({ user }) => [
  buildQuestionsCollection(user),
  dailyQuestionsCollection,
  dailyQuestionMonthsCollection,
  usersCollection,
];

export default collections;
