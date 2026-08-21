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
  /** Opens today's question sheet (docs/prd.md §5.4). Ignored once the day is answered — a spent banner is inert. */
  onPress?: () => void;
}

const styles = StyleSheet.create({
  surface: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(4),
    borderRadius: radius.md,
    padding: spacing(5),
  },
  pending: {
    borderWidth,
    borderColor: colors.border,
    backgroundColor: colors.accent,
  },
  // The treatment the calendar gives a day with nothing behind it: the sand of
  // `muted`, no border, no shadow, nothing to tap. An answered day is done —
  // the banner steps back off the screen the way those cells do, rather than
  // holding the weight the open question had.
  answered: {
    backgroundColor: colors.muted,
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
    color: colors['muted-foreground'],
  },
});

/** A pressed banner sinks by exactly its shadow offset — 4px, the offset of `shadows.md`. */
const SUNK: ViewStyle = { transform: [ { translateX: spacing(1) }, { translateY: spacing(1) } ] };

const ICON_SIZE = 14;

/** The 07:00 Paris draw the daily scheduler runs on — what « demain » actually means. */
const ANSWERED_CAPTION = 'Prochaine question à 7h';

const ANSWERED_LABEL = 'RDV demain';

/**
 * What an answered day leaves in the banner's place (docs/prd.md §5.2): the
 * flat sand a spent calendar cell wears, and no way in — the day is played, the
 * calendar cell is where one goes back to its result (§5.5).
 */
const AnsweredBanner = () => (
  <View style={[ styles.surface, styles.answered ]} accessibilityLabel={`Question du jour répondue. ${ANSWERED_LABEL}.`}>
    <View style={styles.copy}>
      <View style={styles.heading}>
        <Check size={ICON_SIZE} color={colors['muted-foreground']} />
        <Text style={[ styles.caption, styles.answeredText ]}>{ANSWERED_CAPTION}</Text>
      </View>
      <Text style={[ styles.label, styles.answeredText ]}>{ANSWERED_LABEL}</Text>
    </View>
  </View>
);

/**
 * The first thing on the screen once the invitations are through
 * (docs/prd.md §5.2), and the day's status line: the question while it is still
 * waiting, raised on the `accent` the calendar gives an unanswered today, and
 * the second way in to the question sheet (§5.4) — the first being the calendar
 * cell it borrows its colour from. Once the day is answered it keeps the slot
 * and gives it up as a surface: « RDV demain », flat and inert.
 */
export const DailyQuestionBanner = ({ label, onPress }: DailyQuestionBannerProps) => {
  if (label === null) {
    return <AnsweredBanner />;
  }

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Question du jour : ${label}`} onPress={onPress}>
      {({ pressed }) => (
        <View style={[ styles.surface, styles.pending, pressed ? SUNK : shadows.md ]}>
          <View style={styles.copy}>
            <View style={styles.heading}>
              <MessageCircleQuestionMark size={ICON_SIZE} color={colors['accent-foreground']} />
              <Text style={[ styles.caption, styles.pendingText ]}>Question du jour</Text>
            </View>
            <Text style={[ styles.label, styles.pendingText ]} numberOfLines={3}>
              {label}
            </Text>
          </View>

          <ChevronRight size={28} color={colors['accent-foreground']} />
        </View>
      )}
    </Pressable>
  );
};
