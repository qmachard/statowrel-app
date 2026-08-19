import { StyleSheet, Text, View } from 'react-native';

import { shadows } from '@/design/shadows';
import { borderWidth, colors, fontSize, fonts, radius, spacing } from '@/design/tokens';

/** A dimmed option is one the user did not pick — present, but out of the way. */
const DIMMED_OPACITY = 0.5;

const styles = StyleSheet.create({
  option: {
    borderRadius: radius.md,
    borderWidth,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: spacing(5),
    paddingVertical: spacing(4),
  },
  picked: {
    backgroundColor: colors.primary,
  },
  dimmed: {
    opacity: DIMMED_OPACITY,
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
  label: string;
  /** The option this user picked. Their answer is final (docs/prd.md §4.2). */
  picked?: boolean;
  /** One of the options they did not pick — the day is answered, so it recedes. */
  dimmed?: boolean;
}

/**
 * One answer option of docs/prd.md §5.4: full width, `card` surface, thick
 * border, hard offset shadow, label in `font-sans`.
 *
 * Presentational only. Answering is the double tap of §4.3 — first tap selects,
 * second validates — which needs the answer write and the StatOwrel card (§5.5)
 * to land somewhere; until then the list shows the choices without taking one.
 */
export const QuestionOption = ({ label, picked = false, dimmed = false }: QuestionOptionProps) => (
  <View
    style={[
      styles.option,
      picked ? styles.picked : null,
      dimmed ? styles.dimmed : shadows.md,
    ]}
  >
    <Text style={[ styles.label, picked ? styles.pickedLabel : null ]}>{label}</Text>

    {picked ? <Text style={styles.badge}>Ta réponse</Text> : null}
  </View>
);
