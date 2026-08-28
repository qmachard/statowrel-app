import { statLabelOf } from '@statowrel/models';
import { StyleSheet, Text, View, type TextStyle } from 'react-native';

import { type StatOwrel, type StatOwrelRarity, formatShare } from '@/daily-question/helpers/statowrel';
import { FOREGROUND, type Surface } from '@/daily-question/helpers/surface';
import { borderWidth, colors, fontSize, fonts, radius, spacing } from '@/design/tokens';

/** What each rarity tier calls itself. A common answer says nothing — it is the answer everyone else gave. */
const RARITY_LABEL: Partial<Record<StatOwrelRarity, string>> = {
  rare: 'rare',
  ultra: 'ultra rare',
};

const styles = StyleSheet.create({
  headline: {
    gap: spacing(1),
  },
  // The day and its rarity share one micro-line above the phrase — the edition
  // line the card used to carry at its foot.
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing(2),
  },
  date: {
    fontFamily: fonts.sans,
    fontSize: fontSize['2xs'],
    textTransform: 'uppercase',
  },
  badge: {
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
  sentence: {
    fontFamily: fonts.sans,
    fontSize: fontSize.lg,
  },
  emphasis: {
    fontFamily: fonts.head,
  },
  // The one word the whole screen is about — large, and the reason the result
  // is no longer boxed in a card.
  statLabel: {
    fontFamily: fonts.head,
    fontSize: fontSize['2xl'],
    lineHeight: fontSize['2xl'] * 1.1,
    textTransform: 'uppercase',
  },
});

const BADGE = StyleSheet.create({
  common: { backgroundColor: colors.primary, color: colors['primary-foreground'] },
  rare: { backgroundColor: colors.rare, color: colors['rare-foreground'] },
  ultra: { backgroundColor: colors.ultra, color: colors['ultra-foreground'] },
}) satisfies Record<StatOwrelRarity, TextStyle>;

export interface StatOwrelHeadlineProps {
  statOwrel: StatOwrel;
  /** The sheet's own colour — the phrase sits straight on it, so it takes its foreground. */
  surface: Surface;
  /** « Mardi 12 août » — which day one is reading. */
  dateLabel: string;
}

/**
 * The reward of docs/prd.md §5.5, said flat on the sheet rather than framed:
 * « Comme 10% des gens, tu es un.e » and, under it, the StatOwrel in as large a
 * type as the sheet carries.
 *
 * There is no card frame around it on purpose — the phrase *is* the reward, and
 * boxing it made it compete with the recap under it. What the frame used to
 * carry travels with the phrase: the day as its micro-line, and the rarity as a
 * badge beside it. Rarity stays a share computed at display time from
 * `answer_counts` (§5.5) — under 25% gold, under 10% violet — so it keeps moving
 * while the day's answers come in.
 */
export const StatOwrelHeadline = ({ statOwrel, surface, dateLabel }: StatOwrelHeadlineProps) => {
  const { picked, share, rarity } = statOwrel;
  const statLabel = statLabelOf(picked);
  const rarityLabel = RARITY_LABEL[rarity];

  return (
    <View style={styles.headline}>
      <View style={styles.meta}>
        <Text style={[ styles.date, FOREGROUND[surface] ]}>{dateLabel}</Text>

        {rarityLabel === undefined ? null : (
          <Text style={[ styles.badge, BADGE[rarity] ]}>{rarityLabel}</Text>
        )}
      </View>

      <Text style={[ styles.sentence, FOREGROUND[surface] ]}>
        Comme <Text style={styles.emphasis}>{formatShare(share)}</Text> des gens, tu es un.e
      </Text>

      <Text style={[ styles.statLabel, FOREGROUND[surface] ]}>{statLabel}</Text>
    </View>
  );
};
