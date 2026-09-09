import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card, CardContent } from '@/components/Card';
import { colors, fontSize, fonts, spacing } from '@/design/tokens';
import { amountLabel, spokenAmountLabel } from '@/lib/statflouzz';

const styles = StyleSheet.create({
  // The card reads top to bottom as one sentence — the streak names the
  // occasion, the amount is the news, and the line under it is what the news
  // is *for*. Same anatomy as the friend screen's compatibility card.
  block: {
    gap: spacing(1),
  },
  // The card's title, in `CardTitle`'s own treatment a step up: what is being
  // celebrated has to be readable before the amount is, or the number lands
  // without an occasion. Its wording is `StreakCard`'s unit line, so a streak
  // reads identically wherever the app prints one. It stays under the amount's
  // scale — the StatFlouzz are the news, the streak is what earned them.
  streak: {
    fontFamily: fonts.head,
    fontSize: fontSize.lg,
    lineHeight: fontSize.lg * 1.2,
    textTransform: 'uppercase',
    color: colors['primary-foreground'],
  },
  // The one number the card exists for, at the scale the Stats screen gives
  // the streak count itself.
  amount: {
    fontFamily: fonts.head,
    fontSize: fontSize['4xl'],
    lineHeight: fontSize['4xl'] * 1.1,
    color: colors['primary-foreground'],
  },
  // The line that matters: a milestone is not a decoration, it is the price of
  // a question the whole app will answer. Which morning is not promised — a
  // proposal goes through moderation and then through the draw — so the
  // sentence says « un matin » and never « demain ».
  unlocked: {
    fontFamily: fonts.sans,
    fontSize: fontSize.base,
    color: colors['primary-foreground'],
  },
});

export interface StreakMilestoneCardProps {
  /** The streak just reached — 10, 20, 30… */
  streak: number;
  /** The StatFlouzz the account was credited, as the profile proved it was. */
  reward: number;
  /** Opens the proposal form of docs/prd.md §4.7 — the whole point of the card. */
  onPropose: () => void;
}

/**
 * The milestone celebration of docs/prd.md §4.6 and §4.7, on the day's result
 * sheet.
 *
 * A streak pays `STREAK_STATFLOUZZ_REWARD` every ten days and used to pay it in
 * silence: the wallet moved on a screen nobody had a reason to open, so the
 * only reward of the product that is actually *earned* was also the only one
 * never perceived. This says it where it happens, on the sheet of the answer
 * that crossed the milestone.
 *
 * **It adds to the StatOwrel, it does not replace it.** The card sits under the
 * headline, never over it — the mood is what this screen is about, and the
 * money is what the day just bought. It renders the moment the profile proves
 * the credit landed (`useStreakMilestone`), which is a beat after the result;
 * nothing is held back waiting for it.
 *
 * `primary` yellow on the sheet's own accent red — or on the joker's violet —
 * because that is the colour of the wallet everywhere else in the app: the
 * Stats screen's `ProposeQuestionCard` balance, and the price on the button
 * that spends it. The button underneath is `secondary`, the only variant that
 * stands on yellow.
 */
export const StreakMilestoneCard = ({ streak, reward, onPropose }: StreakMilestoneCardProps) => (
  <Card variant="primary" shadow="md">
    <CardContent style={styles.block}>
      <Text style={styles.streak}>{streak} jours d’affilée</Text>

      <Text style={styles.amount} accessibilityLabel={`Plus ${spokenAmountLabel(reward)}`}>
        +{amountLabel(reward)}
      </Text>

      <Text style={styles.unlocked}>
        De quoi poser ta question. Un matin, tout le monde y répondra.
      </Text>
    </CardContent>

    <CardContent>
      <View>
        {/*
          « Ma » and not « une », unlike the Stats card and the Menu: those two
          are a door standing there, this one is a thing that has just become
          the reader's. The sentence above speaks to them (« ta question »), the
          button is spoken by them.
        */}
        <Button label="Poser ma question" variant="secondary" onPress={onPropose} />
      </View>
    </CardContent>
  </Card>
);
