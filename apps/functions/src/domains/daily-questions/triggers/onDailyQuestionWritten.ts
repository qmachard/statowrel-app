import { DAILY_QUESTION_COLLECTION, dailyQuestionConverter } from '@statowrel/models';
import type { QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';

import { parseSnapshotData, REGION_CLOUD } from '@/libs/firebase-admin';

import { onDayWritten } from './steps/onDayWritten';

/**
 * Fires on every write to a day — created, edited or deleted.
 *
 * `onDocumentWritten` rather than `onDocumentCreated`, unlike the answer
 * trigger: a day is not written once and forgotten. A moderator repoints it at
 * another question in the backoffice, or deletes one filled in by mistake, and
 * the calendar index behind it has to follow — see `onDayWritten`.
 *
 * The trigger itself only decodes the event and hands it to its step; the work
 * lives there, so it stays callable from anywhere the projection has to be
 * replayed.
 */
export const onDailyQuestionWritten = onDocumentWritten({
  region: REGION_CLOUD,
  document: `${DAILY_QUESTION_COLLECTION}/{date}`,
}, async (event) => {
  const after = event.data?.after;

  // A written event hands over a plain `DocumentSnapshot` — it has to describe
  // a deletion, where there is no document left. `exists` is what narrows it to
  // the document snapshot the converters read.
  const day = after?.exists === true
    ? parseSnapshotData(after as QueryDocumentSnapshot, dailyQuestionConverter)
    : null;

  await onDayWritten(event.params.date, day);
});
