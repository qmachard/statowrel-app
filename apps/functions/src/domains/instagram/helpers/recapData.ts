import {
  QUESTION_COLLECTION,
  type QuestionData,
  questionConverter,
  statLabelOf,
} from '@statowrel/models';

import { scheduledQuestionOf } from '@/domains/daily-questions';
import { getDocumentRef, parseData } from '@/libs/firebase-admin';

/** One option of a closed day, with the share it ended on. */
export interface RecapOption {
  id: string;
  label: string;
  /** The StatOwrel — « tu es un.e … » — falling back to the option's own label, exactly as the app does. */
  statLabel: string;
  count: number;
  /** Share of the day's answers, `0` to `1` — what the width of a bar is drawn from. */
  share: number;
  /** The same share as a whole percentage. Every option's `percent` sums to exactly 100 — see `wholePercents`. */
  percent: number;
}

/** A closed day, as the carousel renders it. */
export interface DailyRecap {
  /** `YYYY-MM-DD`, Paris. */
  date: string;
  questionId: string;
  question: string;
  /** Every option, **sorted by share, highest first** — the order the bars are drawn in. */
  options: RecapOption[];
  /** The dominant option, the one the headline is about. */
  top: RecapOption;
  totalAnswers: number;
}

/**
 * Turns a question's `answer_counts` into shares.
 *
 * Sums over the question's **own options** rather than over every key of the
 * map, so an option removed since it was answered cannot inflate the
 * denominator and quietly shrink every percentage on the card. Same rule as the
 * app's `src/daily-question/helpers/statowrel.ts`, and the same reason.
 *
 * It is deliberately *not* that function: the app folds in the reader's own
 * answer, because it renders a beat before the trigger has counted it. Nothing
 * here has a reader, and the day it renders is closed.
 */
/**
 * The counts as whole percentages that **sum to 100**, by largest remainder.
 *
 * Rounding each share on its own does not: 44 / 32 / 20 / 5 is four honest
 * roundings and a column that adds up to 101, which on an account whose whole
 * subject is statistics is the first thing somebody comments. So the floors are
 * handed out first and the leftover points go to the largest fractional parts —
 * the same apportionment a parliament seats.
 *
 * It moves at most one option by one point away from its own rounding, and
 * never the leader by enough to disagree with the headline, which reads the
 * same number.
 */
const wholePercents = (counts: number[], total: number): number[] => {
  const exact = counts.map((count) => (count / total) * 100);
  const percents = exact.map(Math.floor);

  const remainders = exact
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction);

  let left = 100 - percents.reduce((sum, value) => sum + value, 0);

  for (const { index } of remainders) {
    if (left <= 0) {
      break;
    }

    percents[index] = (percents[index] ?? 0) + 1;
    left -= 1;
  }

  return percents;
};

const optionsWithShares = (question: QuestionData): { options: RecapOption[]; totalAnswers: number } => {
  const counted = question.options.map((option) => ({
    id: option.id,
    label: option.label,
    statLabel: statLabelOf(option),
    count: question.answer_counts[option.id] ?? 0,
  }));

  const totalAnswers = counted.reduce((total, option) => total + option.count, 0);
  const percents = totalAnswers === 0 ? [] : wholePercents(counted.map((option) => option.count), totalAnswers);

  return {
    totalAnswers,
    options: counted
      .map((option, index) => ({
        ...option,
        share: totalAnswers === 0 ? 0 : option.count / totalAnswers,
        percent: percents[index] ?? 0,
      }))
      // Descending, ties left in the question's own order — `sort` is stable in
      // Node. The card leads with the dominant answer, so the bars read in the
      // order the headline announces rather than in the order the options were
      // typed.
      .sort((a, b) => b.count - a.count),
  };
};

/**
 * The recap of one Paris day, or `null` when there is nothing to post about.
 *
 * Two ways to get `null`, and they are not the same thing to the caller: no
 * question ran that day (the approved pot was empty — `scheduleDailyQuestion`
 * has already logged that as an error), or the question ran and **nobody
 * answered**. The second is why this returns `null` rather than a recap with
 * zeroes: the whole card is a percentage, and there is no percentage of no
 * answers.
 *
 * Reads the month index rather than querying `broadcast_on`: the index is what
 * maps a calendar day to the question that ran it, and it costs two documents
 * against a composite index that would otherwise have to exist.
 */
export const dailyRecapOf = async (date: string): Promise<DailyRecap | null> => {
  const scheduled = await scheduledQuestionOf(date);

  if (scheduled === null) {
    return null;
  }

  const question = parseData(
    await getDocumentRef(QUESTION_COLLECTION, scheduled.question_id, questionConverter).get(),
  );

  if (question === null) {
    return null;
  }

  const { options, totalAnswers } = optionsWithShares(question);
  const [ top ] = options;

  if (top === undefined || totalAnswers === 0) {
    return null;
  }

  return { date, questionId: question.id, question: question.label, options, top, totalAnswers };
};
