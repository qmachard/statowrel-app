import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

import { colors } from '@/design/tokens';

/**
 * The colour one day's sheet wears: the accent red of today, the primary yellow
 * of a past one (docs/prd.md §5.4).
 *
 * Deliberately **not** a function of the answer. Flipping the whole sheet from
 * red to yellow under the success animation reads as a second event competing
 * with it, and the content flipping to the result is already what says the
 * answer landed. The calendar cell behind still goes yellow — that is the
 * calendar's own story about the day, told once the sheet is gone.
 *
 * It lives here rather than in the screen because everything the sheet lays
 * directly on that surface — the phrase and its StatOwrel — has to take the
 * matching foreground: on either coloured ground `muted-foreground` is
 * unreadable, and the palette has no muted token for one.
 */
export type Surface = 'accent' | 'primary' | 'joker';

export const SURFACE = StyleSheet.create({
  accent: { backgroundColor: colors.accent },
  primary: { backgroundColor: colors.primary },
  // A jokered day flips the sheet's own colour to the joker's violet
  // (docs/prd.md §4.8) — the calendar cell already carries it, and the sheet
  // matches so the two say the same thing about the day.
  joker: { backgroundColor: colors.joker },
}) satisfies Record<Surface, ViewStyle>;

export const FOREGROUND = StyleSheet.create({
  accent: { color: colors['accent-foreground'] },
  primary: { color: colors['primary-foreground'] },
  joker: { color: colors['joker-foreground'] },
}) satisfies Record<Surface, TextStyle>;
