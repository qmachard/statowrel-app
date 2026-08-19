import { EntityCollection } from 'firecms';

import questionsCollection from './v1_questions';
import usersCollection from './v1_users';

// Add one collection file per `v1_*` Firestore collection here as the data
// model is designed, then list it below. See CLAUDE.md for the pattern.
const collections: EntityCollection[] = [
  questionsCollection,
  usersCollection,
];

export default collections;
