import { StyleSheet, Text, View, type ViewStyle, type TextStyle } from 'react-native';

import { StatOwrelBar } from '@/daily-question/components/StatOwrelBar';
import { type StatOwrel, type StatOwrelRarity, formatShare, statLabelOf } from '@/daily-question/helpers/statowrel';
import { shadows } from '@/design/shadows';
import { borderWidth, colors, fontSize, fonts, radius, spacing } from '@/design/tokens';

/** What each rarity tier calls itself. A common card says nothing — it is the card everyone else has. */
const RARITY_LABEL: Partial<Record<StatOwrelRarity, string>> = {
  rare: 'rare',
  ultra: 'ultra rare',
};

const styles = StyleSheet.create({
  // The outer frame: thick black border and hard shadow, the card's own surface
  // whatever colour the sheet behind it wears.
  frame: {
    borderRadius: radius.lg,
    borderWidth,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: spacing(2),
  },
  // The inner liseré of docs/prd.md §5.5 — the double framing that makes the
  // thing read as a collectible rather than as a panel. It is the only part
  // rarity changes.
  inner: {
    gap: spacing(4),
    borderRadius: radius.DEFAULT,
    borderWidth,
    padding: spacing(4),
  },
  badge: {
    alignSelf: 'flex-start',
    overflow: 'hidden',
    borderRadius: radius.sm,
    borderWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(0.5),
    fontFamily: fonts.head,
    fontSize: fontSize['2xs'],
    textTransform: 'uppercase',
  },
  // The banner of §5.5: the StatOwrel on the left, the percentage on the right
  // where a Pokémon card carries its HP.
  banner: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing(3),
  },
  // Takes the rest of the row, so a long StatOwrel wraps under itself instead
  // of pushing the percentage out of the frame.
  statLabel: {
    flex: 1,
    fontFamily: fonts.head,
    fontSize: fontSize['3xl'],
    textTransform: 'uppercase',
    color: colors['card-foreground'],
  },
  percent: {
    fontFamily: fonts.head,
    fontSize: fontSize['3xl'],
    color: colors['card-foreground'],
  },
  sentence: {
    fontFamily: fonts.sans,
    fontSize: fontSize.base,
    color: colors['card-foreground'],
  },
  // The one word the whole card is built around, and the number that earns it.
  emphasis: {
    fontFamily: fonts.head,
  },
  // The question and what one answered to it, recessed — the « attaque » block
  // of a trading card.
  question: {
    gap: spacing(1),
    borderRadius: radius.sm,
    borderWidth,
    borderColor: colors.border,
    backgroundColor: colors.muted,
    padding: spacing(3),
  },
  questionLabel: {
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    color: colors['muted-foreground'],
  },
  pickedLabel: {
    fontFamily: fonts.head,
    fontSize: fontSize.base,
    color: colors.foreground,
  },
  bars: {
    gap: spacing(3),
  },
  // The foot of the card — its edition and its illustrator, in trading-card
  // terms. It runs edge to edge under its own rule.
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing(2),
    borderTopWidth: borderWidth,
    borderTopColor: colors.border,
    paddingTop: spacing(3),
  },
  footerText: {
    fontFamily: fonts.sans,
    fontSize: fontSize['2xs'],
    textTransform: 'uppercase',
    color: colors['muted-foreground'],
  },
});

const INNER = StyleSheet.create({
  common: { borderColor: colors.primary },
  rare: { borderColor: colors.rare },
  ultra: { borderColor: colors.ultra },
}) satisfies Record<StatOwrelRarity, ViewStyle>;

const BADGE = StyleSheet.create({
  common: { backgroundColor: colors.primary, color: colors['primary-foreground'] },
  rare: { backgroundColor: colors.rare, color: colors['rare-foreground'] },
  ultra: { backgroundColor: colors.ultra, color: colors['ultra-foreground'] },
}) satisfies Record<StatOwrelRarity, TextStyle>;

export interface StatOwrelCardProps {
  statOwrel: StatOwrel;
  /** The question that was asked — the card's own « attaque » block. */
  questionLabel: string;
  /** « Mardi 12 août » — the card's edition. */
  dateLabel: string;
  /** Whoever proposed the question, credited at the foot (docs/prd.md §5.4). */
  authorName?: string | null;
}

/**
 * The StatOwrel card of docs/prd.md §5.5 — the reward the second tap earns, and
 * what a past answered day reopens to.
 *
 * It deliberately wears the codes of a trading card: double frame, the StatOwrel
 * and its percentage across the top where the HP sit, the question recessed as
 * the attack block, the full distribution as the chiffres at the bottom, the
 * date and the author as the edition and the illustrator.
 *
 * **Rarity is a share, not a stored flag** (§5.5): the rarer the option one
 * picked, the rarer the card — under 25% it takes the gold liseré, under 10%
 * the holographic one. Computed at display time from `answer_counts`, so it
 * keeps moving while answers come in and settles at close. The animated
 * holographic ground of §5.5, the option's illustration and the share button
 * are not built.
 */
export const StatOwrelCard = ({ statOwrel, questionLabel, dateLabel, authorName = null }: StatOwrelCardProps) => {
  const { picked, share, shares, rarity } = statOwrel;
  const statLabel = statLabelOf(picked);
  const rarityLabel = RARITY_LABEL[rarity];

  return (
    <View style={[ styles.frame, shadows.xl ]}>
      <View style={[ styles.inner, INNER[rarity] ]}>
        {rarityLabel === undefined ? null : (
          <Text style={[ styles.badge, BADGE[rarity] ]}>{rarityLabel}</Text>
        )}

        <View style={styles.banner}>
          <Text style={styles.statLabel}>{statLabel}</Text>
          <Text style={styles.percent}>{formatShare(share)}</Text>
        </View>

        <Text style={styles.sentence}>
          Comme <Text style={styles.emphasis}>{formatShare(share)}</Text> des utilisateurs, tu es un.e{' '}
          <Text style={styles.emphasis}>{statLabel}</Text>.
        </Text>

        <View style={styles.question}>
          <Text style={styles.questionLabel}>{questionLabel}</Text>
          <Text style={styles.pickedLabel}>{picked.label}</Text>
        </View>

        <View style={styles.bars}>
          {shares.map((entry) => (
            <StatOwrelBar
              key={entry.option.id}
              label={entry.option.label}
              share={entry.share}
              picked={entry.picked}
            />
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>{dateLabel}</Text>
          {authorName === null ? null : <Text style={styles.footerText}>@{authorName}</Text>}
        </View>
      </View>
    </View>
  );
};
