import type { QuestionData } from '@statowrel/models';

import { formatShortDayLabel, fromDateKey } from '@/lib/dates';
import { STATUS, refunded, spokenRefunded } from '@/questions/copy';

/** Which surface a proposal's badge takes — one per state of docs/prd.md §5.3. */
export type ProposalTone = 'waiting' | 'approved' | 'drawn' | 'rejected';

export interface ProposalStatus {
  /** The badge's own words — « Tirée le 19/08 ». */
  label: string;
  tone: ProposalTone;
  /** The line under the badge, when the state owes an explanation. Null otherwise. */
  detail: string | null;
  /** The same line for a screen reader — it only ever differs by the `§`. */
  spokenDetail: string | null;
  /** The `YYYY-MM-DD` day this question ran, or null when it has not run. */
  broadcastOn: string | null;
}

/**
 * What a rejection has to say for itself: the moderator's reason, then the
 * money.
 *
 * The refund is announced off `refunded_at` and never off the status alone.
 * That stamp and the credit share a transaction (`onQuestionRejected`), so it
 * is the one field that cannot promise StatFlouzz which have not moved — and a
 * proposal that cost nothing (the seeded catalogue, anything written from the
 * console) carries no `statcoin_cost` and is owed nothing.
 */
const rejectionDetail = (question: QuestionData): Pick<ProposalStatus, 'detail' | 'spokenDetail'> => {
  const reason = (question.rejection_reason ?? '').trim();
  const paid = question.statcoin_cost ?? 0;
  // `?? null` and not `!== null`: a nullable model field is `T | null |
  // undefined`, and an undefined `refunded_at` would otherwise announce a refund
  // nobody has been paid.
  const wasRefunded = paid > 0 && (question.refunded_at ?? null) !== null;

  const join = (money: string | null) => [ reason, money ].filter((part) => part !== null && part !== '').join(' ');

  const detail = join(wasRefunded ? refunded(paid) : null);
  const spokenDetail = join(wasRefunded ? spokenRefunded(paid) : null);

  return {
    detail: detail === '' ? null : detail,
    spokenDetail: spokenDetail === '' ? null : spokenDetail,
  };
};

/**
 * A proposal as its author's row reads it (docs/prd.md §5.3).
 *
 * **The broadcast day decides, not the status.** A drawn question is `used`
 * *and* carries `broadcast_on` — the 07:00 run stamps both in the same write —
 * but `used` on its own only says a question left the pot, which a moderator
 * retiring one by hand also does. The day is what the row opens onto, so the
 * day is what the badge is keyed on; a `used` question with no broadcast has
 * nothing to open and reads as validated, which is what it is.
 *
 * `demo` never reaches here — the onboarding sample belongs to nobody, so it is
 * in no author's list — and falls to « En attente », the harmless default.
 */
export const proposalStatusOf = (question: QuestionData): ProposalStatus => {
  if (question.status === 'rejected') {
    return { label: STATUS.rejected, tone: 'rejected', broadcastOn: null, ...rejectionDetail(question) };
  }

  const broadcastOn = question.broadcast_on ?? null;

  if (broadcastOn !== null) {
    return {
      label: `${STATUS.drawn} ${formatShortDayLabel(fromDateKey(broadcastOn))}`,
      tone: 'drawn',
      detail: null,
      spokenDetail: null,
      broadcastOn,
    };
  }

  if (question.status === 'approved' || question.status === 'used') {
    return { label: STATUS.approved, tone: 'approved', detail: null, spokenDetail: null, broadcastOn: null };
  }

  return { label: STATUS.waiting, tone: 'waiting', detail: null, spokenDetail: null, broadcastOn: null };
};
