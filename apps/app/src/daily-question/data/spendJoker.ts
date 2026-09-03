import {
  USE_JOKER_CALLABLE,
  type UseJokerPayload,
  type UseJokerResult,
} from '@statowrel/models';

import { callFunction } from '@/lib/functions';

/**
 * Spends a joker on today's question, through the `questions-useJoker`
 * callable (docs/prd.md §4.8).
 *
 * There is no client-side write here, and no shortcut read: `firestore.rules`
 * denies every client write on the joker sub-collection and on the calendar
 * month, because the debit and the two projections have to be one transaction
 * or the price is optional. The `statcoin_balance` the button reads is a
 * display value — the callable checks it again against the profile it is
 * about to debit.
 *
 * Throws a `FirebaseError` carrying a `functions/*` code; translate it with
 * `jokerFailure` rather than surfacing it.
 */
export const spendJokerCallable = (payload: UseJokerPayload): Promise<UseJokerResult> => (
  callFunction<UseJokerPayload, UseJokerResult>(USE_JOKER_CALLABLE, payload)
);
