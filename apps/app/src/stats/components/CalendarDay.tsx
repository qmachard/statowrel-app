import { Check, Spade } from '@/components/icons';
import { Pressable, StyleSheet, Text, type TextStyle, View, type ViewStyle } from 'react-native';

import { shadows } from '@/design/shadows';
import { borderWidth, colors, fontSize, fonts, radius, spacing } from '@/design/tokens';
import type { CalendarDayState } from '@/stats/helpers/calendarState';

/** The check that stands in for an answered day's number — the cell is small, so it is too. */
const CHECK_SIZE = 20;

const CHECK_STROKE_WIDTH = 3;

/** How far a raised day travels when pressed — the offset of the `sm` shadow it drops. */
const SUNK_BY = 2;

/** The badge — a bead, not a counter: it says « something new », never how much. */
const BADGE_SIZE = 14;

/**
 * How far the bead hangs off the cell, the way an app icon's own badge hangs off
 * the icon. A fifth of it — enough to read as hung on the corner rather than
 * drawn inside it, little enough that it still belongs to the day it sits on,
 * and well inside the 8px gutter the calendar grid leaves between cells, so it
 * never touches its neighbour.
 */
const BADGE_OVERHANG = BADGE_SIZE / 5;

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
  // Hung off the cell's corner, and therefore a sibling of it rather than a
  // child: the cell clips what it holds, so a bead inside it could only ever be
  // tucked in. Absolute, so the number or the check stays centred whether or
  // not the day carries one.
  //
  // One colour whatever the day is (`notification`, see the tokens) — the bead
  // lands across the cell *and* the page behind it, so no colour borrowed from
  // either could show on both. It keeps the border every other surface wears,
  // and needs it more than they do for the same reason.
  badge: {
    position: 'absolute',
    top: -BADGE_OVERHANG,
    right: -BADGE_OVERHANG,
    height: BADGE_SIZE,
    width: BADGE_SIZE,
    borderRadius: radius.full,
    borderWidth,
    borderColor: colors.border,
    backgroundColor: colors.notification,
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
  // A jokered day of docs/prd.md §4.8 — done, but not answered. The joker's
  // own violet, distinct from `primary` (answered) and `accent` (today) and
  // from the muted grey of an idle day; the check on top takes the joker
  // foreground.
  jokered: { borderWidth, borderColor: colors.border, backgroundColor: colors.joker },
}) satisfies Record<CalendarDayState, ViewStyle>;

// Every day with a question behind it is raised — a missed one included, since
// its question can still be caught up on; only `idle` has nothing to press.
const SHADOW: Record<CalendarDayState, ViewStyle | undefined> = {
  answered: shadows.sm,
  today: shadows.sm,
  missed: shadows.sm,
  idle: undefined,
  jokered: shadows.sm,
};

// Pressed, a raised day drops its shadow and translates by the offset it just
// dropped — the same sink as `src/components/Button.tsx`, at `sm`'s 2px.
const SUNK: ViewStyle = { transform: [ { translateX: SUNK_BY }, { translateY: SUNK_BY } ] };

const PRESSED = StyleSheet.create({
  answered: SUNK,
  today: SUNK,
  missed: SUNK,
  idle: {},
  jokered: SUNK,
}) satisfies Record<CalendarDayState, ViewStyle>;

const LABEL = StyleSheet.create({
  answered: { fontFamily: fonts.head, color: colors['primary-foreground'] },
  today: { fontFamily: fonts.head, color: colors['accent-foreground'] },
  missed: { fontFamily: fonts.head, color: colors.foreground },
  idle: { fontFamily: fonts.sans, color: colors['muted-foreground'] },
  jokered: { fontFamily: fonts.head, color: colors['joker-foreground'] },
}) satisfies Record<CalendarDayState, TextStyle>;

// The check takes its surface's own foreground, like the number it replaces —
// black on the yellow of a past answered day, white on the accent of today.
const CHECK_COLOR: Record<CalendarDayState, string> = {
  answered: colors['primary-foreground'],
  today: colors['accent-foreground'],
  missed: colors['muted-foreground'],
  idle: colors['muted-foreground'],
  jokered: colors['joker-foreground'],
};

export interface CalendarDayProps {
  date: Date;
  state: CalendarDayState;
  /**
   * The user answered that day's question. An answered cell shows a check
   * instead of its number — today included, once it has been played.
   */
  answered?: boolean;
  /**
   * Friends have answered that day since it was last opened — the cell carries
   * a bead in its corner until it is opened again (docs/prd.md §5.2).
   */
  hasNewFriendAnswers?: boolean;
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
 *
 * A bead **hung off the corner** — an app icon's badge, not a dot drawn inside
 * the square — says friends have answered that day since it was last opened. It
 * never stands in place of the number or the check: what the cell already said
 * about the day stays said.
 */
export const CalendarDay = ({
  date,
  state,
  answered = false,
  hasNewFriendAnswers = false,
  onPress,
}: CalendarDayProps) => {
  const isInert = state === 'idle' || onPress === undefined;

  return (
    <Pressable style={styles.slot} accessibilityRole="button" disabled={isInert} onPress={onPress}>
      {({ pressed }) => {
        // The bead hangs outside the cell, so it has to be told to sink with it —
        // inside, the cell's own transform would have carried it along.
        const sunk = pressed && !isInert;

        return (
          <>
            <View style={[ styles.cell, SURFACE[state], sunk ? PRESSED[state] : SHADOW[state] ]}>
              {state === 'jokered' && answered ? (
                // Un jour joker : le pique universel des cartes à jouer,
                // rempli plutôt que tracé — le calendrier lit à petite taille et
                // une silhouette pleine se reconnaît d'un coup d'œil là où un
                // contour se perd.
                <Spade size={CHECK_SIZE} color={CHECK_COLOR[state]} fill={CHECK_COLOR[state]} strokeWidth={0} />
              ) : answered ? (
                <Check size={CHECK_SIZE} strokeWidth={CHECK_STROKE_WIDTH} color={CHECK_COLOR[state]} />
              ) : (
                <Text style={[ styles.label, LABEL[state] ]}>
                  {state === 'missed' ? '?' : date.getDate()}
                </Text>
              )}
            </View>

            {hasNewFriendAnswers ? (
              <View style={[ styles.badge, sunk ? PRESSED[state] : null ]} />
            ) : null}
          </>
        );
      }}
    </Pressable>
  );
};
