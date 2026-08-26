import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import {
  DAILY_QUESTION_ANSWER_COLLECTION,
  DEMO_QUESTION_ID,
  QUESTION_COLLECTION,
  dailyQuestionAnswerConverter,
  questionConverter,
} from '@statowrel/models';

import { useAuth } from '@/auth/AuthContext';
import { submitAnswer } from '@/daily-question/data/submitAnswer';
import { firebaseErrorCode } from '@/lib/firebaseError';
import { getDocumentRef, getSubDocumentRef } from '@/lib/firestore';
import { readDoc } from '@/lib/firestoreReads';

import { clearPendingDemoAnswer, readPendingDemoAnswer } from './demoAnswerStore';

/**
 * Which door was shut, so a failed flush says more than that it failed.
 *
 * The three are refused by three different rules — `v1_questions` for the
 * question, the answers sub-collection for the read-back, its `create` for the
 * write — and only the last one is about the answer itself. Collapsing them
 * into one `permission-denied` is what makes this path guesswork to debug.
 */
type FlushStep = 'read-answer' | 'read-question' | 'write-answer';

class FlushFailure extends Error {
  constructor(readonly step: FlushStep, readonly cause: unknown) {
    super(`demo answer flush failed at ${step}`);
  }
}

const failingAt = (step: FlushStep) => (error: unknown): never => {
  throw new FlushFailure(step, error);
};

/**
 * Writes the pick, or leaves it exactly where it was.
 *
 * Split out of the hook because it is run from two places — the session
 * appearing, and the app coming back to the foreground — and neither should
 * carry a copy of it.
 */
const flushPendingDemoAnswer = async (userId: string, cancelled: () => boolean): Promise<void> => {
  const pending = await readPendingDemoAnswer();

  if (pending === null || cancelled()) {
    return;
  }

  const [ existing, question ] = await Promise.all([
    // Already answered — a second account on this phone, a reinstall that kept
    // the pick, or this same account having been through the carousel twice.
    // An answer is final (docs/prd.md §4.2), so the rules would refuse the
    // write anyway; reading is what tells that refusal from a deployment one.
    readDoc(getSubDocumentRef(
      QUESTION_COLLECTION,
      DEMO_QUESTION_ID,
      DAILY_QUESTION_ANSWER_COLLECTION,
      userId,
      dailyQuestionAnswerConverter,
    ), 'demo:own answer').catch(failingAt('read-answer')),
    // Read for its `status`, which is what tells `submitAnswer` to write a
    // demo's shape — an empty day, never late.
    readDoc(getDocumentRef(QUESTION_COLLECTION, DEMO_QUESTION_ID, questionConverter), 'demo:question')
      .catch(failingAt('read-question')),
  ]);

  if (cancelled()) {
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
  }).catch(failingAt('write-answer'));

  await clearPendingDemoAnswer();
};

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
 * failure leaves the pick for the next try.
 *
 * **And the next try is not the next cold launch.** A pick kept is a pick worth
 * retrying, so the flush runs again on every return to the foreground — the
 * same `AppState` door `usePushPermission` uses. A sign-up that landed offline,
 * or a rules deploy that finished while the app sat in somebody's pocket, then
 * heals on its own rather than waiting for the app to be killed and reopened.
 *
 * Nothing here may fail a launch: the warning names the step and the code,
 * since `permission-denied` on the question and on the answer are two different
 * bugs, and neither is a network error.
 */
export const useDemoAnswerFlush = (): void => {
  const { user } = useAuth();
  const userId = user?.uid ?? null;
  // One flush at a time. The foreground listener can fire while the first one
  // is still on its round trip, and two of them racing on the same `create`
  // would have the loser report a `permission-denied` for an answer that did
  // land — the exact misreading the read-first above exists to avoid.
  const running = useRef(false);

  useEffect(() => {
    if (userId === null) {
      return undefined;
    }

    let cancelled = false;

    const flush = async () => {
      if (running.current) {
        return;
      }

      running.current = true;

      try {
        await flushPendingDemoAnswer(userId, () => cancelled);
      } catch (error: unknown) {
        const failure = error instanceof FlushFailure ? error : null;
        const reason = failure?.cause ?? error;
        const code = firebaseErrorCode(reason);

        console.warn(
          `[onboarding] could not write the demo answer (${failure?.step ?? 'flush'}: ${code}), keeping it for the next try`,
          reason,
        );
      } finally {
        running.current = false;
      }
    };

    void flush();

    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') {
        void flush();
      }
    });

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, [ userId ]);
};
