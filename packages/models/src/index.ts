export * from './commons';

// Wire contracts of the callable functions — shared by the app and the backend,
// and the only module here that is not a Firestore collection.
export * from './callables';

// The daily cycle's clock — the Paris wall-clock instants a day key stands for,
// shared by the scheduler that stamps them and by everything that reads them back.
export * from './daily_question_time';

// The currency — what a streak milestone pays and what a question costs. Not a
// collection either: the wallet it moves lives on `v1_users`.
export * from './statflouzz';

// Domain models (v1_*) are added here as they are designed, one file per
// Firestore collection, following the pattern documented in this package's
// CLAUDE.md and in docs/architecture.md at the repo root.
export * from './v1_daily_question_answer';
export * from './v1_daily_question_month';
export * from './v1_question';
export * from './v1_user';
export * from './v1_user_calendar_month';
export * from './v1_user_device';
export * from './v1_user_friend';
export * from './v1_username';
