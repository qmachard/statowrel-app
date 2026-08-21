import { Check, ChevronRight, MessageCircleQuestionMark } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { shadows } from '@/design/shadows';
import { borderWidth, colors, fontSize, fonts, radius, spacing } from '@/design/tokens';

export interface DailyQuestionBannerProps {
  /**
   * `QuestionData.label` — the question itself, the only thing worth reading
   * here — and `null` once the day has been answered, when the banner has the
   * next one to announce instead of this one to ask.
   */
  label: string | null;
  /** Opens today's question sheet (docs/prd.md §5.4) — its result, once answered (§5.5). */
  onPress?: () => void;
}

const styles = StyleSheet.create({
  surface: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(4),
    borderRadius: radius.md,
    borderWidth,
    borderColor: colors.border,
    padding: spacing(5),
  },
  pending: {
    backgroundColor: colors.accent,
  },
  // The yellow an answered day wears in the calendar, exactly as the pending
  // banner wears the accent of an unanswered today — the banner and the cell
  // say the same thing in the same colour.
  answered: {
    backgroundColor: colors.primary,
  },
  copy: {
    flex: 1,
    gap: spacing(1.5),
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
  },
  caption: {
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    textTransform: 'uppercase',
  },
  label: {
    fontFamily: fonts.head,
    fontSize: fontSize.lg,
  },
  pendingText: {
    color: colors['accent-foreground'],
  },
  answeredText: {
    color: colors['primary-foreground'],
  },
});

/** A pressed banner sinks by exactly its shadow offset — 4px, the offset of `shadows.md`. */
const SUNK: ViewStyle = { transform: [ { translateX: spacing(1) }, { translateY: spacing(1) } ] };

/** The 07:00 Paris draw the daily scheduler runs on — what « demain » actually means. */
const ANSWERED_CAPTION = 'Prochaine question à 7h';

const ANSWERED_LABEL = 'RDV demain';

/**
 * The first thing on the screen once the invitations are through
 * (docs/prd.md §5.2), and the day's status line: the question while it is still
 * waiting, on the `accent` the calendar gives an unanswered today, then
 * « RDV demain » on the yellow of an answered day. Either way it is the second
 * way in to the question sheet (§5.4) — the first being the calendar cell it
 * borrows its colour from — which an answered day opens onto its result (§5.5).
 */
export const DailyQuestionBanner = ({ label, onPress }: DailyQuestionBannerProps) => {
  const answered = label === null;
  const text = answered ? styles.answeredText : styles.pendingText;
  const iconColor = answered ? colors['primary-foreground'] : colors['accent-foreground'];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={answered
        ? `Question du jour répondue. ${ANSWERED_LABEL}.`
        : `Question du jour : ${label}`}
      onPress={onPress}
    >
      {({ pressed }) => (
        <View
          style={[
            styles.surface,
            answered ? styles.answered : styles.pending,
            pressed ? SUNK : shadows.md,
          ]}
        >
          <View style={styles.copy}>
            <View style={styles.heading}>
              {answered
                ? <Check size={14} color={iconColor} />
                : <MessageCircleQuestionMark size={14} color={iconColor} />}
              <Text style={[ styles.caption, text ]}>
                {answered ? ANSWERED_CAPTION : 'Question du jour'}
              </Text>
            </View>
            <Text style={[ styles.label, text ]} numberOfLines={3}>
              {answered ? ANSWERED_LABEL : label}
            </Text>
          </View>

          <ChevronRight size={28} color={iconColor} />
        </View>
      )}
    </Pressable>
  );
};
