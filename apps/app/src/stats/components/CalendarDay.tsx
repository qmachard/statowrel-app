import { StyleSheet, Text, type TextStyle, View, type ViewStyle } from 'react-native';

import { shadows } from '@/design/shadows';
import { borderWidth, colors, fontSize, fonts, radius } from '@/design/tokens';
import type { CalendarDayState } from '@/stats/helpers/calendarState';

import { Hatch } from './Hatch';

/** The `?` on a missed day is an ornament, sized below the smallest scale step. */
const MISSED_GLYPH_SIZE = 9;

const styles = StyleSheet.create({
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
  // Doubled border on the accent red, per docs/prd.md §5.2 — today has to read
  // before anything else, and it does so without moving.
  today: { borderWidth: borderWidth * 2, borderColor: colors.border, backgroundColor: colors.accent },
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

const LABEL = StyleSheet.create({
  answered: { fontFamily: fonts.head, color: colors['primary-foreground'] },
  today: { fontFamily: fonts.head, color: colors['accent-foreground'] },
  missed: { fontFamily: fonts.head, color: colors['muted-foreground'] },
  idle: { fontFamily: fonts.sans, color: colors['muted-foreground'] },
}) satisfies Record<CalendarDayState, TextStyle>;

export interface CalendarDayProps {
  date: Date;
  state: CalendarDayState;
}

// Presentational only. The taps of docs/prd.md §5.2 — open the day's card, or
// the question sheet in catch-up mode — land once those screens exist.
export const CalendarDay = ({ date, state }: CalendarDayProps) => (
  <View style={[ styles.cell, SURFACE[state], SHADOW[state] ]}>
    {state === 'missed' ? <Hatch /> : null}
    <Text style={[ styles.label, LABEL[state] ]}>{date.getDate()}</Text>
    {state === 'missed' ? <Text style={styles.missedGlyph}>?</Text> : null}
  </View>
);
