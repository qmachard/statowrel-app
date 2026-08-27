import { QUESTION_TOKEN_COST } from '@statowrel/models';
import { Lightbulb, Lock } from '@/components/icons';

import { Button } from '@/components/Button';

export interface ProposeQuestionButtonProps {
  /** The wallet as the profile carries it — `token_balance`, 0 while it loads. */
  tokens: number;
  /**
   * Opens the proposal form of docs/prd.md §4.7. Left out until that form
   * exists, which keeps the button inert even to whoever has paid for it — a
   * locked door is better than one that opens onto nothing.
   */
  onPress?: () => void;
}

/**
 * The condition, under the label, and only while it is unmet: what is missing,
 * in the currency it is missing in. Where the tokens come from is the strip's
 * job — this line is the price tag.
 */
const missingDescription = (tokens: number): string => (
  `Il te manque ${QUESTION_TOKEN_COST - tokens} jetons`
);

/** The price, once it can be paid. It stays on: a purchase should say what it costs. */
const PRICE_DESCRIPTION = `${QUESTION_TOKEN_COST} jetons`;

/**
 * The bottom of the Stats screen (docs/prd.md §5.2), under the calendar: what
 * the streak is *for*, past the counter. A bare button — a gauge would have
 * taken a card, and a card the height the calendar needs — carrying its own
 * price on the small line under its label.
 *
 * The gate is the wallet, not the streak. It used to be a one-off threshold of
 * 30 consecutive days: reaching it opened the door for good, which said nothing
 * about the second question or the tenth. A balance says the same thing about
 * every one of them — `STREAK_TOKEN_MILESTONE` days answered on time pay
 * `STREAK_TOKEN_REWARD` (docs/prd.md §4.7), a question costs
 * `QUESTION_TOKEN_COST` — and it is the only shape a currency can have the day
 * tokens also come from a bought pack or a watched ad.
 */
export const ProposeQuestionButton = ({ tokens, onPress }: ProposeQuestionButtonProps) => {
  const affordable = tokens >= QUESTION_TOKEN_COST;

  return (
    <Button
      label="Proposer une question"
      description={affordable ? PRICE_DESCRIPTION : missingDescription(tokens)}
      variant={affordable ? 'default' : 'outline'}
      icon={affordable ? Lightbulb : Lock}
      disabled={!affordable || onPress === undefined}
      onPress={onPress}
    />
  );
};
