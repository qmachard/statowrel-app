import { StyleSheet, Text, View } from 'react-native';

import { formatShare } from '@/daily-question/helpers/statowrel';
import { borderWidth, colors, fontSize, fonts, radius, spacing } from '@/design/tokens';

/** A share of 0 still shows a sliver of bar, so an option nobody picked reads as an option rather than as a gap. */
const MIN_TRACK_PERCENT = 2;

/** The bar is a strip, not a surface: its height is a token of its own. */
const TRACK_HEIGHT = spacing(4);

const styles = StyleSheet.create({
  row: {
    gap: spacing(1),
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing(2),
  },
  // Takes the rest of the row, so a long option label wraps instead of pushing
  // its percentage off the card.
  label: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    color: colors['card-foreground'],
  },
  pickedLabel: {
    fontFamily: fonts.head,
  },
  percent: {
    fontFamily: fonts.head,
    fontSize: fontSize.xs,
    color: colors['card-foreground'],
  },
  track: {
    height: TRACK_HEIGHT,
    overflow: 'hidden',
    borderRadius: radius.sm,
    borderWidth,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  fill: {
    height: '100%',
    backgroundColor: colors['muted-foreground'],
  },
  // The user's own share is the one the card is about, so it alone takes a
  // colour — the rest of the day stays grey behind it.
  pickedFill: {
    backgroundColor: colors.primary,
  },
});

export interface StatOwrelBarProps {
  label: string;
  /** Between 0 and 1 — this option's share of the day. */
  share: number;
  /** The option this user picked: the one put forward (docs/prd.md §5.5). */
  picked?: boolean;
}

/**
 * One option's share, as the bordered horizontal bar of the card's stat block
 * (docs/prd.md §5.5): the label and its percentage above, the bar below.
 */
export const StatOwrelBar = ({ label, share, picked = false }: StatOwrelBarProps) => (
  <View style={styles.row}>
    <View style={styles.heading}>
      <Text style={[ styles.label, picked ? styles.pickedLabel : null ]} numberOfLines={2}>{label}</Text>
      <Text style={styles.percent}>{formatShare(share)}</Text>
    </View>

    <View style={styles.track}>
      <View
        style={[
          styles.fill,
          picked ? styles.pickedFill : null,
          { width: `${Math.max(share * 100, MIN_TRACK_PERCENT)}%` },
        ]}
      />
    </View>
  </View>
);
