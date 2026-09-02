import { Check, ChevronRight, MessageCircleQuestionMark } from '@/components/icons';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { shadows } from '@/design/shadows';
import { borderWidth, colors, fontSize, fonts, radius, spacing } from '@/design/tokens';

export interface DailyQuestionBannerProps {
  /**
   * `QuestionData.label` — the question the day is asking, copied into the
   * month index at publication. `null` on a day no question ever dropped on,
   * and unread once the day is answered: the mood replaces it.
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
  // The lead-in, with the check on it — the check is the whole of what used to
  // be a caption line of its own.
  moodLead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
  },
  moodLeadText: {
    fontFamily: fonts.sans,
    fontSize: fontSize.base,
    color: colors['accent-foreground'],
  },
  // The one thing the banner is now for — the result sheet's own treatment
  // (`StatOwrelHeadline`), a step down its scale: the sheet is the word's
  // stage, the banner is where one meets it again.
  moodLabel: {
    fontFamily: fonts.head,
    fontSize: fontSize.xl,
    lineHeight: fontSize.xl * 1.1,
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

/** The check rides on the lead-in line rather than on a caption, so it is sized against it. */
const CHECK_SIZE = 16;

/** The 07:00 Paris draw the daily scheduler runs on — what « demain » actually means. */
const NEXT_DRAW = 'Prochaine question à 7h';

/**
 * The first thing on the screen once the invitations are through
 * (docs/prd.md §5.2), and the day's status line on either side of the answer.
 *
 * While the day is open it announces the question and opens its sheet (§5.4).
 * Once it is answered it says one thing and nothing else — « Aujourd'hui tu es
 * un.e REBELLE », which is the whole point of answering (§5.5) and, until now,
 * something one had to go and find again in the calendar. A tap then reopens
 * that result rather than doing nothing.
 *
 * The question is **not** carried over into that state, and neither is a
 * caption: the mood is worth reading at a glance, and it stops being worth it
 * the moment three other lines want the same glance. The check on the lead-in
 * is all that is left of « tu as répondu ».
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
    : `Aujourd’hui tu es un.e ${mood}. Voir ton résultat.`;

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress}>
      {({ pressed }) => (
        <View style={[ styles.surface, pressed ? SUNK : shadows.md ]}>
          <View style={styles.copy}>
            {mood === null ? (
              <>
                <View style={styles.heading}>
                  <MessageCircleQuestionMark size={ICON_SIZE} color={colors['accent-foreground']} />
                  <Text style={styles.caption}>Question du jour</Text>
                </View>

                <Text style={styles.label} numberOfLines={3}>{label}</Text>
              </>
            ) : (
              <>
                <View style={styles.moodLead}>
                  <Check size={CHECK_SIZE} color={colors['accent-foreground']} />
                  <Text style={styles.moodLeadText}>Aujourd’hui tu es un.e</Text>
                </View>

                <Text style={styles.moodLabel} numberOfLines={2}>{mood}</Text>

                <Text style={styles.footnote}>{NEXT_DRAW}</Text>
              </>
            )}
          </View>

          <ChevronRight size={28} color={colors['accent-foreground']} />
        </View>
      )}
    </Pressable>
  );
};
