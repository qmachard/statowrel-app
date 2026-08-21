import { FirebaseError } from 'firebase/app';
import { getDoc } from 'firebase/firestore';
import { useEffect } from 'react';

import {
  DEMO_QUESTION_ID,
  QUESTION_COLLECTION,
  questionConverter,
} from '@statowrel/models';

import { useAuth } from '@/auth/AuthContext';
import { submitAnswer } from '@/daily-question/data/submitAnswer';
import { getDocumentRef } from '@/lib/firestore';

import { clearPendingDemoAnswer, readPendingDemoAnswer } from './demoAnswerStore';

/**
 * Writes the demo pick made in the carousel, once there is an account to write
 * it under — docs/prd.md §5.6.
 *
 * The carousel runs before sign-up, so the pick waits on the phone
 * (`demoAnswerStore`) rather than being lost or being written by a stranger:
 * an answer's document id *is* its author's UID. This is the other half, one
 * hook mounted from `src/App.tsx` beside the notification one, hanging off
 * `useAuth()` for the same reason — it needs that UID.
 *
 * What it writes counts in the question's `answer_counts` and in nothing else:
 * no calendar entry, no `answers_count`, no streak, since a demo is not a day
 * (the answer trigger's `countDemoAnswer` is what stops there).
 *
 * **Nothing here may fail a launch, and nothing retries forever.** A refusal is
 * final — a `permission-denied` means this account already answered the demo,
 * so the pick is dropped rather than replayed at every launch — while anything
 * else (no network, most often) leaves it waiting for the next one.
 */
export const useDemoAnswerFlush = (): void => {
  const { user } = useAuth();
  const userId = user?.uid ?? null;

  useEffect(() => {
    if (userId === null) {
      return undefined;
    }

    let cancelled = false;

    const flush = async () => {
      const pending = await readPendingDemoAnswer();

      if (pending === null || cancelled) {
        return;
      }

      // Read for its `status`, which is what tells `submitAnswer` to write a
      // demo's shape — an empty day, never late. One read, and only ever for a
      // phone that actually went through the demo.
      const question = (await getDoc(
        getDocumentRef(QUESTION_COLLECTION, DEMO_QUESTION_ID, questionConverter),
      )).data() ?? null;

      if (question === null || cancelled) {
        return;
      }

      try {
        await submitAnswer({
          userId,
          questionId: DEMO_QUESTION_ID,
          question,
          optionId: pending.option_id,
          answeredAt: pending.answered_at,
        });
      } catch (error: unknown) {
        if (!(error instanceof FirebaseError) || error.code !== 'permission-denied') {
          throw error;
        }
      }

      await clearPendingDemoAnswer();
    };

    void flush().catch((error: unknown) => {
      console.warn('[onboarding] could not write the demo answer, keeping it for the next launch', error);
    });

    return () => {
      cancelled = true;
    };
  }, [ userId ]);
};
