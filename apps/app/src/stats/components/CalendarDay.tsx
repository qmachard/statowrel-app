import { Pressable, StyleSheet, Text, type TextStyle, View, type ViewStyle } from 'react-native';

import { shadows } from '@/design/shadows';
import { borderWidth, colors, fontSize, fonts, radius, spacing } from '@/design/tokens';
import type { CalendarDayState } from '@/stats/helpers/calendarState';

import { Hatch } from './Hatch';

/** The `?` on a missed day is an ornament, sized below the smallest scale step. */
const MISSED_GLYPH_SIZE = 9;

/** How far a raised day travels when pressed — the offset of the `sm` shadow it drops. */
const SUNK_BY = 2;

const PRESSED_OPACITY = 0.8;

const styles = StyleSheet.create({
  // The pressable wraps the cell, so it is the one that has to fill the square
  // the calendar grid hands it.
  slot: {
    height: '100%',
    width: '100%',
  },
  cell: {
    height: '100%',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: radius.DEFAULT,
    paddingHorizontal: spacing(0.5),
  },
  label: {
    fontSize: fontSize.sm,
  },
  statLabel: {
    maxWidth: '100%',
    fontFamily: fonts.sans,
    fontSize: fontSize['2xs'],
    textTransform: 'uppercase',
    color: colors['primary-foreground'],
  },
  missedGlyph: {
    fontFamily: fonts.head,
    fontSize: MISSED_GLYPH_SIZE,
    color: colors['muted-foreground'],
  },
});

const SURFACE = StyleSheet.create({
  answered: { borderWidth, borderColor: colors.border, backgroundColor: colors.primary },
  // Exactly the treatment an answered day gets — border and hard shadow alike —
  // with the accent red as its only difference (docs/prd.md §5.2). The colour
  // carries today on its own; the doubled border it used to wear did not.
  today: { borderWidth, borderColor: colors.border, backgroundColor: colors.accent },
  missed: { borderWidth, borderColor: colors.border, backgroundColor: colors.background },
  idle: { backgroundColor: colors.muted },
}) satisfies Record<CalendarDayState, ViewStyle>;

// An answered day and today are raised; the days with nothing to show are flat.
const SHADOW: Record<CalendarDayState, ViewStyle | undefined> = {
  answered: shadows.sm,
  today: shadows.sm,
  missed: undefined,
  idle: undefined,
};

// Pressed, a raised day drops its shadow and translates by the offset it just
// dropped — the same sink as `src/components/Button.tsx`, at `sm`'s 2px. A flat
// day has nothing to sink into, so it dims instead.
const SUNK: ViewStyle = { transform: [ { translateX: SUNK_BY }, { translateY: SUNK_BY } ] };

const PRESSED = StyleSheet.create({
  answered: SUNK,
  today: SUNK,
  missed: { opacity: PRESSED_OPACITY },
  idle: {},
}) satisfies Record<CalendarDayState, ViewStyle>;

const LABEL = StyleSheet.create({
  answered: { fontFamily: fonts.head, color: colors['primary-foreground'] },
  today: { fontFamily: fonts.head, color: colors['accent-foreground'] },
  missed: { fontFamily: fonts.head, color: colors['muted-foreground'] },
  idle: { fontFamily: fonts.sans, color: colors['muted-foreground'] },
}) satisfies Record<CalendarDayState, TextStyle>;

export interface CalendarDayProps {
  date: Date;
  state: CalendarDayState;
  /**
   * The `stat_label` earned that day, on an answered cell — docs/prd.md §5.2
   * asks for it in micro-text, truncated. It comes copied on the calendar month
   * itself, so rendering it costs no extra read.
   */
  statLabel?: string | null;
  /** Opens that day (docs/prd.md §5.2). An `idle` day stays inert whatever is passed. */
  onPress?: () => void;
}

/**
 * A day of the month calendar, and the way into that day's question
 * (docs/prd.md §5.2). Every state but `idle` is tappable: `idle` is a future
 * day, one before the account existed, or one that never had a question — and
 * there is nothing behind any of them.
 *
 * A raised day sinks into its own shadow when pressed, like the buttons do —
 * `shadows.sm` is a 2px offset, so that is exactly how far it travels.
 */
export const CalendarDay = ({ date, state, statLabel = null, onPress }: CalendarDayProps) => {
  const isInert = state === 'idle' || onPress === undefined;

  return (
    <Pressable style={styles.slot} accessibilityRole="button" disabled={isInert} onPress={onPress}>
      {({ pressed }) => (
        <View
          style={[
            styles.cell,
            SURFACE[state],
            pressed && !isInert ? PRESSED[state] : SHADOW[state],
          ]}
        >
          {state === 'missed' ? <Hatch /> : null}
          <Text style={[ styles.label, LABEL[state] ]}>{date.getDate()}</Text>
          {state === 'answered' && statLabel ? (
            <Text style={styles.statLabel} numberOfLines={1}>{statLabel}</Text>
          ) : null}
          {state === 'missed' ? <Text style={styles.missedGlyph}>?</Text> : null}
        </View>
      )}
    </Pressable>
  );
};
