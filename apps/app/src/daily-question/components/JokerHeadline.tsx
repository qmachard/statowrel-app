import { StyleSheet, Text, View } from 'react-native';

import { FOREGROUND, type Surface } from '@/daily-question/helpers/surface';
import { fontSize, fonts, spacing } from '@/design/tokens';

const styles = StyleSheet.create({
  headline: {
    gap: spacing(1),
  },
  // The day, same micro-line as the answered result's — the reward format
  // both sides share, so the sheet reads as the same object whether the day
  // was answered or passed with a Joker.
  date: {
    fontFamily: fonts.sans,
    fontSize: fontSize['2xs'],
    textTransform: 'uppercase',
  },
  sentence: {
    fontFamily: fonts.sans,
    fontSize: fontSize.lg,
  },
  // The one word the whole screen is about — same scale as
  // `StatOwrelHeadline`'s `statLabel`, since JOKER stands in for the mood
  // here and reads as it.
  jokerLabel: {
    fontFamily: fonts.head,
    fontSize: fontSize['2xl'],
    lineHeight: fontSize['2xl'] * 1.1,
    textTransform: 'uppercase',
  },
});

export interface JokerHeadlineProps {
  /** The sheet's own colour — every line sits straight on it. */
  surface: Surface;
  /** « Mardi 12 août » — same shape the answered headline uses. */
  dateLabel: string;
}

/**
 * The reward of docs/prd.md §4.8 said in the same anatomy as
 * `StatOwrelHeadline`: date on top, a small sentence, then the one word the
 * screen is about — here « JOKER ».
 *
 * No rarity badge — a Joker is not a card to be rare or common; it is what
 * the user picked instead of picking.
 */
export const JokerHeadline = ({ surface, dateLabel }: JokerHeadlineProps) => (
  <View style={styles.headline}>
    <Text style={[ styles.date, FOREGROUND[surface] ]}>{dateLabel}</Text>

    <Text style={[ styles.sentence, FOREGROUND[surface] ]}>Tu as utilisé un</Text>

    <Text style={[ styles.jokerLabel, FOREGROUND[surface] ]}>JOKER</Text>
  </View>
);
