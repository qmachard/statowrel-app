import { Check, ChevronRight, MessageCircleQuestionMark } from '@/components/icons';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { shadows } from '@/design/shadows';
import { borderWidth, colors, fontSize, fonts, radius, spacing } from '@/design/tokens';

export interface DailyQuestionBannerProps {
  /**
   * `QuestionData.label` — the question the day is asking, copied into the
   * month index at publication. `null` on a day no question ever dropped on.
   */
  label: string | null;
  /**
   * The picked option's `stat_label` — the mood of the day (docs/prd.md §5.5),
   * and `null` until the day is answered.
   *
   * It comes from `v1_user_calendar_months`, which the Stats screen already
   * reads for its calendar: the banner announces it for no read of its own.
   */
  statLabel: string | null;
  /** Opens today's question sheet (docs/prd.md §5.4) — its result (§5.5) once the day is answered. */
  onPress?: () => void;
}

const styles = StyleSheet.create({
  // One surface whatever side of the answer one is on: the `accent` today wears
  // in the calendar. The day keeps its colour once it is played — the calendar
  // cell already does exactly that (docs/prd.md §5.2).
  surface: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(4),
    borderRadius: radius.md,
    borderWidth,
    borderColor: colors.border,
    backgroundColor: colors.accent,
    padding: spacing(5),
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
    color: colors['accent-foreground'],
  },
  // The question while it is still the thing to do: as large as the banner goes.
  label: {
    fontFamily: fonts.head,
    fontSize: fontSize.lg,
    color: colors['accent-foreground'],
  },
  // The same question once it is answered — demoted, but never dropped: it is
  // what the mood under it is the answer to.
  question: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    color: colors['accent-foreground'],
  },
  mood: {
    paddingTop: spacing(1),
  },
  moodLead: {
    fontFamily: fonts.sans,
    fontSize: fontSize.base,
    color: colors['accent-foreground'],
  },
  // The one thing the banner is now for — the same treatment the result sheet
  // gives it (`StatOwrelHeadline`), so the day says the same word twice at the
  // same weight.
  moodLabel: {
    fontFamily: fonts.head,
    fontSize: fontSize['2xl'],
    lineHeight: fontSize['2xl'] * 1.1,
    textTransform: 'uppercase',
    color: colors['accent-foreground'],
  },
  // The promise of tomorrow, kept as a micro-line: it is the only place the app
  // says when the draw runs, and it is what brings anyone back in the morning.
  footnote: {
    paddingTop: spacing(1),
    fontFamily: fonts.sans,
    fontSize: fontSize['2xs'],
    textTransform: 'uppercase',
    color: colors['accent-foreground'],
  },
});

/** A pressed banner sinks by exactly its shadow offset — 4px, the offset of `shadows.md`. */
const SUNK: ViewStyle = { transform: [ { translateX: spacing(1) }, { translateY: spacing(1) } ] };

const ICON_SIZE = 14;

/** The 07:00 Paris draw the daily scheduler runs on — what « demain » actually means. */
const NEXT_DRAW = 'Prochaine question à 7h';

/**
 * The first thing on the screen once the invitations are through
 * (docs/prd.md §5.2), and the day's status line on either side of the answer.
 *
 * While the day is open it announces the question and opens its sheet (§5.4).
 * Once it is answered it keeps the question, small, and says the day's
 * **mood** under it — « Aujourd'hui tu es REBELLE » — which is the whole point
 * of answering (§5.5) and, until now, something one had to go and find again in
 * the calendar. A tap then reopens that result rather than doing nothing.
 *
 * It keeps its `accent` surface throughout, for the reason the calendar's own
 * cell does (§5.2): today is the day the screen is about, answered or not, and
 * letting it go flat dissolved it into the month.
 */
export const DailyQuestionBanner = ({ label, statLabel, onPress }: DailyQuestionBannerProps) => {
  // An empty label is a day whose projection predates the copy, or a question
  // rewritten under it — there is no mood to announce, so the banner falls back
  // to what it can say.
  const mood = statLabel === null || statLabel.length === 0 ? null : statLabel;

  if (mood === null && label === null) {
    return null;
  }

  const accessibilityLabel = mood === null
    ? `Question du jour : ${label ?? ''}`
    : `Aujourd’hui tu es ${mood}. Voir ton résultat.`;

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress}>
      {({ pressed }) => (
        <View style={[ styles.surface, pressed ? SUNK : shadows.md ]}>
          <View style={styles.copy}>
            <View style={styles.heading}>
              {mood === null ? (
                <MessageCircleQuestionMark size={ICON_SIZE} color={colors['accent-foreground']} />
              ) : (
                <Check size={ICON_SIZE} color={colors['accent-foreground']} />
              )}

              <Text style={styles.caption}>{mood === null ? 'Question du jour' : 'Tu as répondu'}</Text>
            </View>

            {label === null ? null : (
              <Text style={mood === null ? styles.label : styles.question} numberOfLines={mood === null ? 3 : 2}>
                {label}
              </Text>
            )}

            {mood === null ? null : (
              <View style={styles.mood}>
                <Text style={styles.moodLead}>Aujourd’hui tu es</Text>
                <Text style={styles.moodLabel} numberOfLines={2}>{mood}</Text>
              </View>
            )}

            {mood === null ? null : <Text style={styles.footnote}>{NEXT_DRAW}</Text>}
          </View>

          <ChevronRight size={28} color={colors['accent-foreground']} />
        </View>
      )}
    </Pressable>
  );
};
