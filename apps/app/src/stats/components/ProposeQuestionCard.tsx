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
 * How the currency works, said in one sentence under the title — the whole of
 * docs/prd.md §4.7's earning rule, and the only place the app states it.
 */
const RULE = `Gagne ${STREAK_STATCOIN_REWARD} StatCoins pour chaque série de ${STREAK_STATCOIN_MILESTONE} réussie`;

/** French takes the singular at zero, so this is not `> 0`. */
const statcoinsLabel = (statcoins: number): string => (
  `${statcoins} ${statcoins > 1 ? 'StatCoins' : 'StatCoin'}`
);

const styles = StyleSheet.create({
  // The balance is a chip, not a headline: the card's subject is what it buys,
  // and the number is only there to say how close one is to buying it.
  balance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
  },
  balanceLabel: {
    fontFamily: fonts.head,
    fontSize: fontSize.base,
    color: colors.foreground,
  },
  // The footer is `muted` and edge to edge by default; the button is the only
  // thing in it, so it takes the whole width.
  action: {
    flex: 1,
  },
});

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
 * chased, it is how the economy works, and it is as true with 500 StatCoins in
 * hand as with none.
 */
export const ProposeQuestionCard = ({ statcoins, onPress }: ProposeQuestionCardProps) => {
  const affordable = statcoins >= QUESTION_STATCOIN_COST;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Deviens acteur de StatOwrel</CardTitle>
        <CardDescription>{RULE}</CardDescription>
      </CardHeader>

      <CardContent>
        <View style={styles.balance}>
          <Coins size={18} color={colors.foreground} />
          <Text style={styles.balanceLabel}>{statcoinsLabel(statcoins)}</Text>
        </View>
      </CardContent>

      <CardFooter>
        {/* `Button` owns its own surface and takes no `style`, so the width is
            the wrapper's business — the footer is a row, and this is its only
            child. The price rides in the label with the coin behind it: it is
            what the button *does*, not a caveat under it, and it stays there
            once it can be paid — a purchase should say what it costs. */}
        <View style={styles.action}>
          <Button
            label={`Poser une question ${QUESTION_STATCOIN_COST}`}
            variant={affordable ? 'default' : 'outline'}
            icon={Coins}
            iconPosition="end"
            disabled={!affordable || onPress === undefined}
            onPress={onPress}
          />
        </View>
      </CardFooter>
    </Card>
  );
};
