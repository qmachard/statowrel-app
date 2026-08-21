import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { shadows } from '@/design/shadows';
import { borderWidth, colors, fontSize, fonts, radius, spacing } from '@/design/tokens';

/** The letter badge is a square, so its side is a token rather than a padding. */
const LETTER_SIZE = spacing(9);

/** `A`, `B`, `C`… for the option at that rank — a question carries 2 to 6 (docs/prd.md §4.2). */
export const letterOf = (index: number) => String.fromCharCode('A'.charCodeAt(0) + index);

const styles = StyleSheet.create({
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(4),
    borderRadius: radius.md,
    borderWidth,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(4),
  },
  selected: {
    backgroundColor: colors.primary,
  },
  // The quizz marker: a bordered square holding the option's letter, so the
  // options read as A / B / C the way a quizz card does.
  letterBox: {
    height: LETTER_SIZE,
    width: LETTER_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth,
    borderColor: colors.border,
    // A cream square on the white card, a white one on the yellow of a selected
    // option — the badge never melts into the surface behind it.
    backgroundColor: colors.background,
  },
  selectedLetterBox: {
    backgroundColor: colors.card,
  },
  letter: {
    fontFamily: fonts.head,
    fontSize: fontSize.base,
    color: colors.foreground,
  },
  // Takes the rest of the row, so a long label wraps instead of pushing the
  // letter out of the card.
  body: {
    flex: 1,
  },
  label: {
    fontFamily: fonts.sans,
    fontSize: fontSize.base,
    color: colors['card-foreground'],
  },
  selectedLabel: {
    color: colors['primary-foreground'],
  },
  badge: {
    marginTop: spacing(1),
    fontFamily: fonts.head,
    fontSize: fontSize.xs,
    textTransform: 'uppercase',
    color: colors['primary-foreground'],
  },
});

/**
 * A selected option rides higher than the rest — the lift of docs/prd.md §4.3,
 * a bigger shadow plus the matching offset, so it looks raised off the sheet
 * rather than merely bigger.
 */
const LIFT: ViewStyle = { transform: [ { translateX: -spacing(0.5) }, { translateY: -spacing(0.5) } ] };

/** A pressed option sinks by exactly its shadow offset — 4px, the offset of `shadows.md`. */
const SUNK: ViewStyle = { transform: [ { translateX: spacing(1) }, { translateY: spacing(1) } ] };

export interface QuestionOptionProps {
  /** `A`, `B`, … — the option's rank in the question's fixed order (docs/prd.md §4.2). */
  letter: string;
  label: string;
  /**
   * First tap done, waiting for the second: the option is lifted and asks to be
   * tapped again (docs/prd.md §4.3).
   */
  selected?: boolean;
  /** Absent while the answer is being written — the choice is final, so the row stops taking taps. */
  onPress?: () => void;
}

/**
 * One answer option of docs/prd.md §5.4: full width, `card` surface, thick
 * border, hard offset shadow, label in `font-sans` behind its quizz letter.
 *
 * It carries the double tap of §4.3 without knowing it is a double tap: the
 * screen decides what each tap means and hands back `selected`, this row only
 * renders the two states — resting, or selected and waiting for confirmation.
 * There is no « Valider » button by design; the micro-text under a selected
 * label is what says so.
 *
 * It never renders an answered option: once the day is answered the sheet shows
 * the StatOwrel card of §5.5 instead, and the card carries the picked option.
 */
export const QuestionOption = ({ letter, label, selected = false, onPress }: QuestionOptionProps) => (
  <Pressable
    accessibilityRole="button"
    accessibilityState={{ selected, disabled: onPress === undefined }}
    accessibilityLabel={selected ? `${label}. Tape encore pour valider` : label}
    disabled={onPress === undefined}
    onPress={onPress}
  >
    {({ pressed }) => (
      <View
        style={[
          styles.option,
          selected ? styles.selected : null,
          selected ? shadows.lg : shadows.md,
          pressed ? SUNK : selected ? LIFT : null,
        ]}
      >
        <View style={[ styles.letterBox, selected ? styles.selectedLetterBox : null ]}>
          <Text style={styles.letter}>{letter}</Text>
        </View>

        <View style={styles.body}>
          <Text style={[ styles.label, selected ? styles.selectedLabel : null ]}>{label}</Text>

          {selected ? <Text style={styles.badge}>Tape encore pour valider</Text> : null}
        </View>
      </View>
    )}
  </Pressable>
);
