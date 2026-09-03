import { QUESTION_STATFLOUZZ_COST, STREAK_STATFLOUZZ_MILESTONE, STREAK_STATFLOUZZ_REWARD } from '@statowrel/models';
import { Alert, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { amountLabel, spokenAmountLabel } from '@/lib/statflouzz';

export interface ProposeQuestionCardProps {
  /** The wallet as the profile carries it — `statcoin_balance`, 0 while it loads. */
  statflouzz: number;
  /**
   * Opens the proposal form of docs/prd.md §4.7 (`src/questions/`). Still
   * optional, and the button stays inert without it: the card is rendered by
   * one screen, and a door that opens onto nothing is worse than a locked one.
   */
  onPress?: () => void;
}

const styles = StyleSheet.create({
  // Applied when the user cannot afford a proposal — the button below stays
  // tappable, so the wrapper is what makes it read as unavailable at a glance.
  greyed: {
    opacity: 0.5,
  },
});

const missing = (statflouzz: number): number => Math.max(QUESTION_STATFLOUZZ_COST - statflouzz, 0);

/**
 * The bottom of the Stats screen (docs/prd.md §5.2), under the calendar: the
 * §4.7 door, priced rather than gated. The wallet is announced in the header,
 * so the row is the bare CTA that spends it.
 *
 * Under price the button *looks* disabled (dimmed, `outline` variant) but stays
 * tappable — tapping it explains why nothing happens, so the user is never
 * left guessing whether the button is broken or their wallet is short.
 */
export const ProposeQuestionCard = ({ statflouzz, onPress }: ProposeQuestionCardProps) => {
  const affordable = statflouzz >= QUESTION_STATFLOUZZ_COST;

  const handlePress = () => {
    if (!affordable) {
      Alert.alert(
        'Solde insuffisant',
        `Poser une question coûte ${amountLabel(QUESTION_STATFLOUZZ_COST)}. `
        + `Il te manque ${amountLabel(missing(statflouzz))}. `
        + `Gagne ${amountLabel(STREAK_STATFLOUZZ_REWARD)} tous les ${STREAK_STATFLOUZZ_MILESTONE} jours de série.`,
        [ { text: 'OK' } ],
      );
      return;
    }
    onPress?.();
  };

  return (
    <View style={affordable ? undefined : styles.greyed}>
      <Button
        label="Poser une question"
        trailingLabel={amountLabel(QUESTION_STATFLOUZZ_COST)}
        accessibilityLabel={`Poser une question, ${spokenAmountLabel(QUESTION_STATFLOUZZ_COST)}`}
        variant={affordable ? 'default' : 'outline'}
        disabled={onPress === undefined}
        onPress={handlePress}
      />
    </View>
  );
};
