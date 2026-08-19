import type { ReactNode } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { pagePadding, spacing } from '@/design/tokens';

export interface StatsStripProps {
  children?: ReactNode;
}

const styles = StyleSheet.create({
  root: {
    // Bleeds back through the screen's padding so the strip runs edge to edge:
    // a card scrolling out is cut by the screen, not by an invisible gutter.
    marginHorizontal: -pagePadding,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing(4),
    paddingHorizontal: pagePadding,
    // The hard offset shadows fall outside the cards — without this the strip
    // would clip them at the bottom.
    paddingBottom: spacing(2),
  },
});

/**
 * The streak and its counters on a single scrolling line (docs/prd.md §5.2).
 * One row, no wrap: the screen keeps its vertical budget for the calendar, and
 * the counters ride along instead of stacking under the streak.
 */
export const StatsStrip = ({ children }: StatsStripProps) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.root} contentContainerStyle={styles.content}>
    {children}
  </ScrollView>
);
