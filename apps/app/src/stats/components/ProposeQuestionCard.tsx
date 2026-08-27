import { QUESTION_STATCOIN_COST, STREAK_STATCOIN_MILESTONE, STREAK_STATCOIN_REWARD } from '@statowrel/models';
import { Coins } from '@/components/icons';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/Card';
import { colors, fontSize, fonts, spacing } from '@/design/tokens';

export interface ProposeQuestionCardProps {
  /** The wallet as the profile carries it — `statcoin_balance`, 0 while it loads. */
  statcoins: number;
  /**
   * Opens the proposal form of docs/prd.md §4.7. Left out until that form
   * exists, which keeps the button inert even to whoever has paid for it — a
   * locked door is better than one that opens onto nothing.
   */
  onPress?: () => void;
}

/**
 * An amount of StatCoins, in the currency's own symbol — set after the number
 * the way € is, and written here rather than at each of the three call sites
 * below so the symbol has one home.
 */
const amountLabel = (amount: number): string => `${amount}§`;

/**
 * The same amount for a screen reader, which would read the symbol as a section
 * sign or skip it outright. Every `§` on this card has one of these behind it.
 */
const spokenAmountLabel = (amount: number): string => `${amount} StatCoins`;

/**
 * How the currency works, said in one sentence under the title — the whole of
 * docs/prd.md §4.7's earning rule, and the only place the app states it.
 */
const RULE = `Gagne ${amountLabel(STREAK_STATCOIN_REWARD)} pour chaque série de ${STREAK_STATCOIN_MILESTONE} réussie`;

const styles = StyleSheet.create({
  // The wallet is the card's one number, so it sits in the middle of it rather
  // than against the left edge the header reads from.
  content: {
    alignItems: 'center',
  },
  balance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
  },
  // The scale of the streak's own count, and deliberately: they are the two
  // numbers the screen is about, and one of them turns into the other.
  balanceLabel: {
    fontFamily: fonts.head,
    fontSize: fontSize['4xl'],
    lineHeight: fontSize['4xl'],
    color: colors.foreground,
  },
  // The footer is `muted` and edge to edge by default; the button is the only
  // thing in it, so it takes the whole width.
  action: {
    flex: 1,
  },
});

/** Sized against the count beside it rather than against the body text. */
const COIN_SIZE = spacing(7);

/**
 * The bottom of the Stats screen (docs/prd.md §5.2), under the calendar: what
 * the days answered are *for*, past the counter.
 *
 * It used to be a bare button carrying its condition on one small line, back
 * when that condition was a single 30-day threshold — one sentence states a
 * door that opens once and stays open. A currency is not that: it has a rule,
 * a balance and a price, and a button that only ever says what is missing
 * leaves somebody to guess where StatCoins come from. So the card says the rule
 * once, shows the balance, and carries the price on the button that spends it.
 *
 * The rule stays put once the price is covered. It is not a condition being
 * chased, it is how the economy works, and it is as true with 500§ in hand as
 * with none.
 */
export const ProposeQuestionCard = ({ statcoins, onPress }: ProposeQuestionCardProps) => {
  const affordable = statcoins >= QUESTION_STATCOIN_COST;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Deviens acteur de StatOwrel</CardTitle>
        <CardDescription>{RULE}</CardDescription>
      </CardHeader>

      <CardContent style={styles.content}>
        <View style={styles.balance} accessible accessibilityLabel={spokenAmountLabel(statcoins)}>
          <Coins size={COIN_SIZE} color={colors.foreground} />
          <Text style={styles.balanceLabel}>{amountLabel(statcoins)}</Text>
        </View>
      </CardContent>

      <CardFooter>
        {/* `Button` owns its own surface and takes no `style`, so the width is
            the wrapper's business — the footer is a row, and this is its only
            child. The price sits in the button's trailing slot rather than in
            its label: it is what the action costs, not what the action is, so
            it gets the sans face a step down instead of the label's own. It
            stays there once it can be paid — a purchase should say what it
            costs. */}
        <View style={styles.action}>
          <Button
            label="Poser une question"
            trailingLabel={amountLabel(QUESTION_STATCOIN_COST)}
            accessibilityLabel={`Poser une question, ${spokenAmountLabel(QUESTION_STATCOIN_COST)}`}
            variant={affordable ? 'default' : 'outline'}
            disabled={!affordable || onPress === undefined}
            onPress={onPress}
          />
        </View>
      </CardFooter>
    </Card>
  );
};
