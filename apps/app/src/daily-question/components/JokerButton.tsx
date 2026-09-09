import { JOKER_STATFLOUZZ_COST } from '@statowrel/models';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { confirmJoker } from '@/daily-question/helpers/confirmJoker';
import { amountLabel, spokenAmountLabel } from '@/lib/statflouzz';

/**
 * The « passer avec un joker » button — docs/prd.md §4.8.
 *
 * The `joker` variant so the button wears the same violet the calendar cell,
 * the banner and every other joker surface use: seeing that colour once trains
 * the user to recognise it everywhere. The price rides on `trailingLabel` the
 * way `ProposeQuestionCard` prices its own button — a price qualifies an
 * action rather than naming it, and a symbol with two homes is a symbol that
 * drifts.
 *
 * **Confirms before spending**, through `confirmJoker` — the alert moved into
 * a helper of its own when the 21:00 streak reminder became its second caller
 * (docs/prd.md §4.6). A joker is irreversible on both directions, and the one
 * dialog that says so has to say it the same way wherever it is raised from.
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

export const JokerButton = ({ balance, loading, onConfirm }: JokerButtonProps) => {
  const affordable = balance >= JOKER_STATFLOUZZ_COST;
  const description = affordable
    ? undefined
    : `Solde : ${amountLabel(balance)}. Il t’en manque pour un Joker.`;

  return (
    <View style={styles.wrapper}>
      <Button
        label="Passer avec un Joker"
        description={description}
        trailingLabel={amountLabel(JOKER_STATFLOUZZ_COST)}
        variant="joker"
        loading={loading}
        disabled={!affordable || loading}
        onPress={() => confirmJoker(onConfirm)}
        accessibilityLabel={`Passer avec un Joker, ${spokenAmountLabel(JOKER_STATFLOUZZ_COST)}`}
      />
    </View>
  );
};
