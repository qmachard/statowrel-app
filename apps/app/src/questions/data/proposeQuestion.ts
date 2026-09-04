import {
  PROPOSE_QUESTION_CALLABLE,
  type ProposeQuestionPayload,
  type ProposeQuestionResult,
} from '@statowrel/models';

import { track } from '@/analytics/analytics';
import { callFunction } from '@/lib/functions';

/**
 * Proposes a question and pays for it, through the `questions-proposeQuestion`
 * callable (docs/prd.md §4.7).
 *
 * There is no client-side write here and no shortcut read either, unlike
 * `friends/data/inviteFriend.ts`: `firestore.rules` closed `v1_questions` to
 * every client (`allow create: if false`), because the debit and the write have
 * to be one transaction or the price is optional. The balance the button reads
 * is the profile's, and it is a display value — the callable checks it again
 * against the document it is about to debit.
 *
 * Throws a `FirebaseError` carrying a `functions/*` code; translate it with
 * `proposalFailure` rather than surfacing it.
 */
export const proposeQuestion = async (payload: ProposeQuestionPayload): Promise<ProposeQuestionResult> => {
  const result = await callFunction<ProposeQuestionPayload, ProposeQuestionResult>(PROPOSE_QUESTION_CALLABLE, payload);

  track({ name: 'question_proposed', params: { options_count: payload.options.length } });

  return result;
};
