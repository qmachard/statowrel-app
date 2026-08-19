import { Pressable, StyleSheet, Text, type TextStyle, View, type ViewStyle } from 'react-native';

import { shadows } from '@/design/shadows';
import { borderWidth, colors, fontSize, fonts, radius } from '@/design/tokens';
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
  },
  label: {
    fontSize: fontSize.sm,
  },
  missedGlyph: {
    fontFamily: fonts.head,
    fontSize: MISSED_GLYPH_SIZE,
    color: colors['muted-foreground'],
  },
});

const SURFACE = StyleSheet.create({
  answered: { borderWidth, borderColor: colors.border, backgroundColor: colors.primary },
  // Bare accent red, per docs/prd.md §5.2 — the only unbordered cell of the
  // grid besides `idle`: the flat red already reads before anything else, and a
  // border would only tie it back to the days around it.
  today: { backgroundColor: colors.accent },
  missed: { borderWidth, borderColor: colors.border, backgroundColor: colors.background },
  idle: { backgroundColor: colors.muted },
}) satisfies Record<CalendarDayState, ViewStyle>;

// Only an answered day is raised.
const SHADOW: Record<CalendarDayState, ViewStyle | undefined> = {
  answered: shadows.sm,
  today: undefined,
  missed: undefined,
  idle: undefined,
};

// Pressed, a raised day drops its shadow and translates by the offset it just
// dropped — the same sink as `src/components/Button.tsx`, at `sm`'s 2px. A flat
// day has nothing to sink into, so it dims instead.
const PRESSED = StyleSheet.create({
  answered: { transform: [ { translateX: SUNK_BY }, { translateY: SUNK_BY } ] },
  today: { opacity: PRESSED_OPACITY },
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
  /** Opens that day (docs/prd.md §5.2). An `idle` day stays inert whatever is passed. */
  onPress?: () => void;
}

/**
 * A day of the month calendar, and the way into that day's question
 * (docs/prd.md §5.2). Every state but `idle` is tappable: `idle` is a future day
 * or one before the account existed, and there is nothing behind it.
 *
 * A raised day sinks into its own shadow when pressed, like the buttons do —
 * `shadows.sm` is a 2px offset, so that is exactly how far it travels.
 */
export const CalendarDay = ({ date, state, onPress }: CalendarDayProps) => {
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
          {state === 'missed' ? <Text style={styles.missedGlyph}>?</Text> : null}
        </View>
      )}
    </Pressable>
  );
};
