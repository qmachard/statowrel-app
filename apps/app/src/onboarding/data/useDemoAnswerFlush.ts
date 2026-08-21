import { FirebaseError } from 'firebase/app';
import { getDoc } from 'firebase/firestore';
import { useEffect } from 'react';

import {
  DAILY_QUESTION_ANSWER_COLLECTION,
  DEMO_QUESTION_ID,
  QUESTION_COLLECTION,
  dailyQuestionAnswerConverter,
  questionConverter,
} from '@statowrel/models';

import { useAuth } from '@/auth/AuthContext';
import { submitAnswer } from '@/daily-question/data/submitAnswer';
import { getDocumentRef, getSubDocumentRef } from '@/lib/firestore';

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
 * **The pick is only ever dropped once it has landed, or once the answer it
 * would create is already there.** Deciding that from the error instead — a
 * `permission-denied` reading as « already answered » — quietly throws the pick
 * away on a project whose rules have not been deployed yet, which is the one
 * failure this is most likely to meet. So the document is read first, and every
 * failure leaves the pick for the next launch.
 *
 * Nothing here may fail a launch: one attempt per session, and the warning
 * carries the code, since `permission-denied` and a network error mean very
 * different things to whoever is looking.
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

      const [ existing, question ] = await Promise.all([
        // Already answered — a second account on this phone, or a reinstall
        // that kept the pick. The rules would refuse the write anyway; reading
        // is what tells the two refusals apart.
        getDoc(getSubDocumentRef(
          QUESTION_COLLECTION,
          DEMO_QUESTION_ID,
          DAILY_QUESTION_ANSWER_COLLECTION,
          userId,
          dailyQuestionAnswerConverter,
        )),
        // Read for its `status`, which is what tells `submitAnswer` to write a
        // demo's shape — an empty day, never late.
        getDoc(getDocumentRef(QUESTION_COLLECTION, DEMO_QUESTION_ID, questionConverter)),
      ]);

      if (cancelled) {
        return;
      }

      if (existing.exists()) {
        await clearPendingDemoAnswer();

        return;
      }

      const demo = question.data() ?? null;

      if (demo === null) {
        return;
      }

      await submitAnswer({
        userId,
        questionId: DEMO_QUESTION_ID,
        question: demo,
        optionId: pending.option_id,
        answeredAt: pending.answered_at,
      });

      await clearPendingDemoAnswer();
    };

    void flush().catch((error: unknown) => {
      const code = error instanceof FirebaseError ? error.code : 'unknown';

      console.warn(
        `[onboarding] could not write the demo answer (${code}), keeping it for the next launch`,
        error,
      );
    });

    return () => {
      cancelled = true;
    };
  }, [ userId ]);
};
