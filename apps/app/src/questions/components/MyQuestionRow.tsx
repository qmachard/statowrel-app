import { ChevronRight } from '@/components/icons';
import { Pressable, StyleSheet, Text, type TextStyle, View, type ViewStyle } from 'react-native';

import { borderWidth, colors, fontSize, fonts, radius, spacing } from '@/design/tokens';
import type { ProposalStatus, ProposalTone } from '@/questions/helpers/proposalStatus';

/** The chevron of a row that opens onto something — the banner's own, one step down. */
const CHEVRON_SIZE = 20;

export interface MyQuestionRowProps {
  /** The question as it was written — docs/prd.md §5.3 asks for the wording, not a summary. */
  label: string;
  status: ProposalStatus;
  /** Opens the day this question ran. Left out on every proposal that has not run: there is nothing to open. */
  onPress?: () => void;
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(3),
    paddingHorizontal: spacing(5),
    paddingVertical: spacing(4),
  },
  // The row has no surface of its own — the card is the surface — so the press
  // is shown by the only step there is under the card: `muted`.
  pressed: {
    backgroundColor: colors.muted,
  },
  body: {
    flex: 1,
    alignItems: 'flex-start',
    gap: spacing(2),
  },
  label: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.sm,
    color: colors['card-foreground'],
  },
  // A pill rather than the buttons' `sm` corner: the row itself is what can be
  // tapped, and a badge shaped like a button would offer a press it does not take.
  badge: {
    borderWidth,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: spacing(2.5),
    paddingVertical: spacing(1),
  },
  badgeLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize['2xs'],
    textTransform: 'uppercase',
  },
  detail: {
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    color: colors['muted-foreground'],
  },
});

/**
 * One flat fill per state, all four taken from the palette — no colour is
 * invented for a status. Waiting is the recessed surface, validated is the
 * identity yellow, drawn is the ink itself (the terminal state, and the only
 * one that opens onto something), refused is `destructive`.
 */
const TONE = StyleSheet.create({
  waiting: { backgroundColor: colors.muted },
  approved: { backgroundColor: colors.primary },
  drawn: { backgroundColor: colors.secondary },
  rejected: { backgroundColor: colors.destructive },
}) satisfies Record<ProposalTone, ViewStyle>;

const TONE_LABEL = StyleSheet.create({
  waiting: { color: colors.foreground },
  approved: { color: colors['primary-foreground'] },
  drawn: { color: colors['secondary-foreground'] },
  rejected: { color: colors['destructive-foreground'] },
}) satisfies Record<ProposalTone, TextStyle>;

/**
 * One line of « Mes questions »: the question as it was written, the badge its
 * state wears, and under it whatever that state still owes — the moderator's
 * reason, the StatFlouzz handed back.
 *
 * It carries no surface of its own, like `FriendRow`: the card around the list
 * is the surface, and the rows are cut out of it by separators.
 *
 * Only a drawn question is pressable. The others open onto nothing — a proposal
 * still in the pot has no day, and no screen of its own to show — so they take
 * no chevron and no press either: a row that answers a tap with nothing is
 * worse than one that plainly does not take it.
 */
export const MyQuestionRow = ({ label, status, onPress }: MyQuestionRowProps) => {
  const body = (
    <>
      <View style={styles.body}>
        <Text style={styles.label} numberOfLines={2}>
          {label}
        </Text>

        <View style={[ styles.badge, TONE[status.tone] ]}>
          <Text style={[ styles.badgeLabel, TONE_LABEL[status.tone] ]}>{status.label}</Text>
        </View>

        {status.detail === null ? null : (
          <Text style={styles.detail} accessibilityLabel={status.spokenDetail ?? undefined}>
            {status.detail}
          </Text>
        )}
      </View>

      {onPress === undefined ? null : (
        <ChevronRight size={CHEVRON_SIZE} color={colors['muted-foreground']} />
      )}
    </>
  );

  if (onPress === undefined) {
    return <View style={styles.root}>{body}</View>;
  }

  return (
    <Pressable
      style={({ pressed }) => [ styles.root, pressed ? styles.pressed : null ]}
      accessibilityRole="button"
      accessibilityLabel={`${label}. ${status.label}. Ouvrir la journée.`}
      onPress={onPress}
    >
      {body}
    </Pressable>
  );
};
