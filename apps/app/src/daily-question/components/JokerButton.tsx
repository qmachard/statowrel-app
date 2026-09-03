import { JOKER_STATFLOUZZ_COST } from '@statowrel/models';
import { Alert, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { amountLabel, spokenAmountLabel } from '@/lib/statflouzz';

/**
 * The « passer avec un joker » button — docs/prd.md §4.8.
 *
 * A ghost variant so it does not compete with the answer options above it (an
 * answer is the primary action, a joker is the way out), the price on its
 * `trailingLabel` slot the way `ProposeQuestionCard` prices its own button —
 * a price qualifies an action rather than naming it, and a symbol with two
 * homes is a symbol that drifts.
 *
 * **Confirms before spending.** A native alert asks first because a joker is
 * irreversible on both directions: the day is passed and the StatFlouzz are
 * spent, and neither can be got back on a mis-tap. The wording states the
 * three consequences that matter — day passed, série préservée, prix — in the
 * user's own frame of reference so the confirmation is not a mystery.
 *
 * Two disabled states: while a joker is in flight (`loading`), and when the
 * wallet is short of `JOKER_STATFLOUZZ_COST`. The wallet case still shows the
 * button rather than hiding it, so the user sees the price and knows what
 * remains to be earned — the sentence under the label names the shortfall
 * exactly like the empty-wallet sentence on the proposal side.
 */
export interface JokerButtonProps {
  balance: number;
  loading: boolean;
  onConfirm: () => void;
}

const styles = StyleSheet.create({
  wrapper: {
    // A little breathing room around the button — the options above are a
    // block of their own with their own gap.
    gap: 0,
  },
});

const CONFIRM_TITLE = 'Passer cette journée ?';
const CONFIRM_MESSAGE = `Ta journée sera comptée et ta série préservée. Tu dépenseras ${amountLabel(JOKER_STATFLOUZZ_COST)}. Cette action est irréversible.`;
const CONFIRM_ACCEPT = 'Passer';
const CONFIRM_CANCEL = 'Annuler';

export const JokerButton = ({ balance, loading, onConfirm }: JokerButtonProps) => {
  const affordable = balance >= JOKER_STATFLOUZZ_COST;
  const description = affordable
    ? undefined
    : `Solde : ${amountLabel(balance)}. Il t’en manque pour un joker.`;

  const onPress = () => {
    Alert.alert(CONFIRM_TITLE, CONFIRM_MESSAGE, [
      { text: CONFIRM_CANCEL, style: 'cancel' },
      { text: CONFIRM_ACCEPT, style: 'default', onPress: onConfirm },
    ]);
  };

  return (
    <View style={styles.wrapper}>
      <Button
        label="Passer avec un joker"
        description={description}
        trailingLabel={amountLabel(JOKER_STATFLOUZZ_COST)}
        variant="ghost"
        loading={loading}
        disabled={!affordable || loading}
        onPress={onPress}
        accessibilityLabel={`Passer avec un joker, ${spokenAmountLabel(JOKER_STATFLOUZZ_COST)}`}
      />
    </View>
  );
};
