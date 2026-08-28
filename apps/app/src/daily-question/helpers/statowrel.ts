import { type QuestionData, type QuestionOptionData, findQuestionOption } from '@statowrel/models';

/**
 * How rare the card is (docs/prd.md §5.5): the rarer the option one picked, the
 * rarer the card. Computed at display time from `answer_counts`, never stored —
 * it keeps moving while answers come in and settles at close.
 */
export type StatOwrelRarity = 'common' | 'rare' | 'ultra';

/** A share strictly under this is `rare`; under `ULTRA_UNDER`, `ultra`. */
const RARE_UNDER = 0.25;
const ULTRA_UNDER = 0.1;

export interface StatOwrelShare {
  option: QuestionOptionData;
  /** Answers on that option, the picked one folded in — see `buildStatOwrel`. */
  count: number;
  /** That option's share of the day, between 0 and 1. */
  share: number;
  /** The option this user picked — the one the card is about. */
  picked: boolean;
}

export interface StatOwrel {
  picked: QuestionOptionData;
  /** What the phrase says: the picked option's share, between 0 and 1. */
  share: number;
  /** Every option of the question, in its fixed order (docs/prd.md §4.2). */
  shares: StatOwrelShare[];
  total: number;
  rarity: StatOwrelRarity;
}

/** « 68% » — a whole percent, which is the only precision the phrase can carry. */
export const formatShare = (share: number): string => `${Math.round(share * 100)}%`;

export const rarityOf = (share: number): StatOwrelRarity => {
  if (share < ULTRA_UNDER) {
    return 'ultra';
  }

  return share < RARE_UNDER ? 'rare' : 'common';
};

/**
 * The picked option's count, with **this user's own answer folded in when the
 * tally does not carry it yet**.
 *
 * The app writes the answer, the answer trigger increments `answer_counts` a
 * beat later (docs/prd.md §6), and the day screen reads the question once at
 * the door rather than subscribing to it: between the two, a tally read is one
 * answer short of the truth — the reader's own. `ownAnswerPending` is the
 * caller's word on that beat, and it is knowable rather than guessed: the
 * trigger stamps `counted_at` on the answer in the same transaction as the
 * increment, and the screen reads the question first and the answer second, so
 * a marker still absent proves the tally was taken without it
 * (`useDailyQuestion`).
 *
 * The floor is what is left of the old heuristic, for the callers that cannot
 * answer the question — the onboarding demo's visitor, an answer written before
 * the marker existed: whoever is looking at this card answered it, so the
 * option they picked is never worth zero.
 */
const countOf = (
  counts: Record<string, number>,
  optionId: string,
  pickedId: string,
  ownAnswerPending: boolean,
): number => {
  const stored = counts[optionId] ?? 0;

  if (optionId !== pickedId) {
    return stored;
  }

  return ownAnswerPending ? stored + 1 : Math.max(stored, 1);
};

/**
 * Everything the StatOwrel card of docs/prd.md §5.5 says about one answer:
 * the option it picked, its share of the day, the full distribution and the
 * rarity that follows from it.
 *
 * Returns `null` when the answer points at an option the question no longer
 * carries — impossible by design (an option is never removed from a broadcast
 * question) but cheaper to render as « no card » than to guess a label for.
 *
 * The totals are summed over the **question's own options** rather than over
 * every key of `answer_counts`: a key left behind by a rewritten question would
 * otherwise inflate the denominator of a percentage nobody can see the numerator
 * of.
 */
export const buildStatOwrel = (
  question: QuestionData,
  answerCounts: Record<string, number>,
  optionId: string,
  ownAnswerPending: boolean,
): StatOwrel | null => {
  const picked = findQuestionOption(question.options, optionId);

  if (picked === null) {
    return null;
  }

  const counts = question.options.map((option) => ({
    option,
    count: countOf(answerCounts, option.id, picked.id, ownAnswerPending),
  }));

  // At least 1: the picked option was just folded in, so the day is never empty
  // by the time this runs. Guarded all the same — a division is not the place
  // to rely on that.
  const total = Math.max(counts.reduce((sum, entry) => sum + entry.count, 0), 1);

  const shares = counts.map(({ option, count }) => ({
    option,
    count,
    share: count / total,
    picked: option.id === picked.id,
  }));

  const share = shares.find((entry) => entry.picked)?.share ?? 0;

  return { picked, share, shares, total, rarity: rarityOf(share) };
};
