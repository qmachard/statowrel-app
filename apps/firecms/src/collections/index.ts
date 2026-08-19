import { EntityCollection } from 'firecms';

import questionsCollection from './questions';

// Add one collection file per `v1_*` Firestore collection here as the data
// model is designed, then list it below. See CLAUDE.md for the pattern.
const collections: EntityCollection[] = [
  questionsCollection,
];

export default collections;
