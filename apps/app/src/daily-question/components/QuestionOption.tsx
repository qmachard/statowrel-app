import { StyleSheet, Text, View } from 'react-native';

import { shadows } from '@/design/shadows';
import { borderWidth, colors, fontSize, fonts, radius, spacing } from '@/design/tokens';

/** A dimmed option is one the user did not pick — present, but out of the way. */
const DIMMED_OPACITY = 0.5;

/** The letter badge is a square, so its side is a token rather than a padding. */
const LETTER_SIZE = spacing(9);

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
  picked: {
    backgroundColor: colors.primary,
  },
  dimmed: {
    opacity: DIMMED_OPACITY,
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
    // A cream square on the white card, a white one on the yellow of a picked
    // option — the badge never melts into the surface behind it.
    backgroundColor: colors.background,
  },
  pickedLetterBox: {
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
  pickedLabel: {
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

export interface QuestionOptionProps {
  /** `A`, `B`, … — the option's rank in the question's fixed order (docs/prd.md §4.2). */
  letter: string;
  label: string;
  /** The option this user picked. Their answer is final (docs/prd.md §4.2). */
  picked?: boolean;
  /** One of the options they did not pick — the day is answered, so it recedes. */
  dimmed?: boolean;
}

/**
 * One answer option of docs/prd.md §5.4: full width, `card` surface, thick
 * border, hard offset shadow, label in `font-sans` behind its quizz letter.
 *
 * Presentational only. Answering is the double tap of §4.3 — first tap selects,
 * second validates — which needs the answer write and the StatOwrel card (§5.5)
 * to land somewhere; until then the list shows the choices without taking one.
 */
export const QuestionOption = ({ letter, label, picked = false, dimmed = false }: QuestionOptionProps) => (
  <View
    style={[
      styles.option,
      picked ? styles.picked : null,
      dimmed ? styles.dimmed : shadows.md,
    ]}
  >
    <View style={[ styles.letterBox, picked ? styles.pickedLetterBox : null ]}>
      <Text style={styles.letter}>{letter}</Text>
    </View>

    <View style={styles.body}>
      <Text style={[ styles.label, picked ? styles.pickedLabel : null ]}>{label}</Text>

      {picked ? <Text style={styles.badge}>Ta réponse</Text> : null}
    </View>
  </View>
);
