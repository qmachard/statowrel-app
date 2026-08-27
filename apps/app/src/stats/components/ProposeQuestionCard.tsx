import { QUESTION_TOKEN_COST, STREAK_TOKEN_MILESTONE, STREAK_TOKEN_REWARD } from '@statowrel/models';
import { Coins, Lightbulb, Lock } from '@/components/icons';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/Card';
import { colors, borderWidth, fontSize, fonts, radius, spacing } from '@/design/tokens';

export interface ProposeQuestionCardProps {
  /** The wallet as the profile carries it — `token_balance`, 0 while it loads. */
  tokens: number;
  /**
   * Opens the proposal form of docs/prd.md §4.7. Left out until that form
   * exists, which keeps the button inert even to whoever has paid for it — a
   * locked door is better than one that opens onto nothing.
   */
  onPress?: () => void;
}

/** The rule itself, said once, whether or not it has been met — it is what the card is here to teach. */
const RULE = `Tous les ${STREAK_TOKEN_MILESTONE} jours de série, tu gagnes ${STREAK_TOKEN_REWARD} jetons.`;

/** What the gauge is filling towards, kept beside it so the number is never alone. */
const TARGET = `${QUESTION_TOKEN_COST} pour poser`;

const styles = StyleSheet.create({
  content: {
    gap: spacing(3),
  },
  // The track carries the border and clips the fill, so the fill never rides
  // over it — a 2px border is the surface here, not a decoration.
  track: {
    height: spacing(4),
    borderRadius: radius.full,
    borderWidth,
    borderColor: colors.border,
    backgroundColor: colors.muted,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  gauge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing(3),
  },
  balance: {
    fontFamily: fonts.head,
    fontSize: fontSize.xl,
    color: colors.foreground,
  },
  target: {
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    textTransform: 'uppercase',
    color: colors['muted-foreground'],
  },
  // The rule is the one line that never changes, so it is set apart from the
  // numbers above it rather than reading as a third one.
  rule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
  },
  ruleLabel: {
    flexShrink: 1,
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    color: colors['muted-foreground'],
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
 * when that condition was a single 30-day threshold — one sentence was enough
 * to state a door that opens once and stays open. A currency is not one
 * sentence: there is a price, a balance, a distance between the two and a way
 * of covering it, and a button that only ever says what is missing leaves
 * somebody to guess where tokens come from. So the whole mechanic is on the
 * card — the balance against the price as a gauge, and under it the rule that
 * moves it (docs/prd.md §4.7).
 *
 * The rule line stays put once the price is covered. It is not a condition
 * being chased, it is how the economy works, and it is just as true with 500
 * tokens in hand as with none.
 */
export const ProposeQuestionCard = ({ tokens, onPress }: ProposeQuestionCardProps) => {
  const affordable = tokens >= QUESTION_TOKEN_COST;
  // Capped: a balance worth three questions fills the gauge, it does not
  // overrun it. The number beside it is what says how far past the price it is.
  const progress = Math.min(tokens / QUESTION_TOKEN_COST, 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ta question</CardTitle>
        <CardDescription>Une fois validée, tout le monde y répond à 7h.</CardDescription>
      </CardHeader>

      <CardContent style={styles.content}>
        <View style={styles.gauge}>
          <Text style={styles.balance}>{tokens} {tokens > 1 ? 'jetons' : 'jeton'}</Text>
          <Text style={styles.target}>{TARGET}</Text>
        </View>

        <View
          style={styles.track}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: QUESTION_TOKEN_COST, now: Math.min(tokens, QUESTION_TOKEN_COST) }}
        >
          <View style={[ styles.fill, { width: `${progress * 100}%` } ]} />
        </View>

        <View style={styles.rule}>
          <Coins size={16} color={colors['muted-foreground']} />
          <Text style={styles.ruleLabel}>{RULE}</Text>
        </View>
      </CardContent>

      <CardFooter>
        {/* `Button` owns its own surface and takes no `style`, so the width is
            the wrapper's business — the footer is a row, and this is its only
            child. */}
        <View style={styles.action}>
          <Button
            label="Proposer une question"
            variant={affordable ? 'default' : 'outline'}
            icon={affordable ? Lightbulb : Lock}
            disabled={!affordable || onPress === undefined}
            onPress={onPress}
          />
        </View>
      </CardFooter>
    </Card>
  );
};
