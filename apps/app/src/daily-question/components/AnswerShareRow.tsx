import { Check } from '@/components/icons';
import { StyleSheet, Text, View } from 'react-native';

import { formatShare } from '@/daily-question/helpers/statowrel';
import { borderWidth, colors, fontSize, fonts, radius, spacing } from '@/design/tokens';

/** A share of 0 still shows a sliver of fill, so an option nobody picked reads as an option rather than as an empty row. */
const MIN_FILL_PERCENT = 2;

/** The tick that says « this one is yours » — sized on the label it sits beside. */
const CHECK_SIZE = fontSize.base;

const styles = StyleSheet.create({
  // The bar *is* the row: the fill runs behind the label rather than under it,
  // so one option is one line instead of a label, a percentage and a track.
  row: {
    overflow: 'hidden',
    borderRadius: radius.sm,
    borderWidth,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  fill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: colors.muted,
  },
  // The user's own share is the one the screen is about, so it alone takes the
  // yellow — the rest of the day stays behind it.
  pickedFill: {
    backgroundColor: colors.primary,
  },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2.5),
  },
  // Takes the rest of the row, so a long option label wraps instead of pushing
  // its percentage out of the card.
  label: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    color: colors['card-foreground'],
  },
  pickedLabel: {
    fontFamily: fonts.head,
  },
  percent: {
    fontFamily: fonts.head,
    fontSize: fontSize.sm,
    color: colors['card-foreground'],
  },
});

export interface AnswerShareRowProps {
  label: string;
  /** Between 0 and 1 — this option's share of the day. */
  share: number;
  /** The option this user picked: the one in yellow, behind its tick (docs/prd.md §5.5). */
  picked?: boolean;
}

/**
 * One option of the answered question: its label, its share of the day as the
 * width of the fill behind it, and that share written out on the right. The
 * picked one takes the yellow and a tick, which is the whole reason the recap
 * needs no legend to say which answer was one's own.
 */
export const AnswerShareRow = ({ label, share, picked = false }: AnswerShareRowProps) => (
  <View style={styles.row}>
    <View
      style={[
        styles.fill,
        picked ? styles.pickedFill : null,
        { width: `${Math.max(share * 100, MIN_FILL_PERCENT)}%` },
      ]}
    />

    <View style={styles.body}>
      {picked ? <Check size={CHECK_SIZE} color={colors.foreground} strokeWidth={3} /> : null}

      <Text style={[ styles.label, picked ? styles.pickedLabel : null ]}>{label}</Text>
      <Text style={styles.percent}>{formatShare(share)}</Text>
    </View>
  </View>
);
