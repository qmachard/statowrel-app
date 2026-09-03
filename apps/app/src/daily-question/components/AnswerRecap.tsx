import { StyleSheet, Text, View } from 'react-native';

import { Card, CardContent } from '@/components/Card';
import { AnswerShareRow } from '@/daily-question/components/AnswerShareRow';
import type { StatOwrel } from '@/daily-question/helpers/statowrel';
import { colors, fontSize, fonts, spacing } from '@/design/tokens';

const styles = StyleSheet.create({
  body: {
    gap: spacing(3),
  },
  // The question is no longer the sheet's title once it is answered — it is
  // what the recap is about, so it opens the card in the smaller type of a
  // caption rather than in the display type of a prompt.
  question: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    color: colors['muted-foreground'],
  },
  rows: {
    gap: spacing(2),
  },
});

export interface AnswerRecapShare {
  optionId: string;
  label: string;
  share: number;
  picked: boolean;
}

export interface AnswerRecapProps {
  questionLabel: string;
  /**
   * Either a full StatOwrel — an answered day, with one option in yellow behind
   * a tick — or a pre-computed share list for a jokered day (docs/prd.md
   * §4.8): same rows, no picked option, no tick.
   */
  statOwrel: StatOwrel | null;
  /** Shares for the joker case, when `statOwrel` is `null`. Ignored otherwise. */
  shares?: AnswerRecapShare[];
}

/**
 * What was asked and how the day answered it: the question, then every option
 * with its share, one row each, the picked one in yellow behind its tick
 * (docs/prd.md §5.5).
 *
 * It is the only framed surface of an answered day — the phrase above it sits
 * straight on the sheet. The shares are the `answer_counts` shape at display
 * time, so they keep moving while the day's answers come in.
 *
 * A jokered day (docs/prd.md §4.8) reuses the same block with no picked
 * option: `statOwrel` is `null` and `shares` carries the same rows minus the
 * yellow. « Joker complet » means the friends' unlock also unlocks reading
 * the global distribution — that is the recap.
 */
export const AnswerRecap = ({ questionLabel, statOwrel, shares }: AnswerRecapProps) => {
  const rows = statOwrel !== null
    ? statOwrel.shares.map((entry) => ({
      optionId: entry.option.id,
      label: entry.option.label,
      share: entry.share,
      picked: entry.picked,
    }))
    : shares ?? [];

  return (
    <Card variant="card" shadow="md">
      <CardContent style={styles.body}>
        <Text style={styles.question}>{questionLabel}</Text>

        <View style={styles.rows}>
          {rows.map((entry) => (
            <AnswerShareRow
              key={entry.optionId}
              label={entry.label}
              share={entry.share}
              picked={entry.picked}
            />
          ))}
        </View>
      </CardContent>
    </Card>
  );
};
