import { StyleSheet, Text, View } from 'react-native';

import { Card, CardContent } from '@/components/Card';
import { AnswerShareRow } from '@/daily-question/components/AnswerShareRow';
import { type StatOwrel, statLabelOf } from '@/daily-question/helpers/statowrel';
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

export interface AnswerRecapProps {
  questionLabel: string;
  statOwrel: StatOwrel;
}

/**
 * What was asked and how the day answered it: the question, then every option
 * with its share, one row each, the picked one in yellow behind its tick
 * (docs/prd.md §5.5). A row is named by its StatOwrel rather than by its option
 * label — the recap says which kind of person the day made, not what was
 * clicked.
 *
 * It is the only framed surface of an answered day — the phrase above it sits
 * straight on the sheet. The shares are the `answer_counts` shape at display
 * time, so they keep moving while the day's answers come in.
 */
export const AnswerRecap = ({ questionLabel, statOwrel }: AnswerRecapProps) => (
  <Card variant="card" shadow="md">
    <CardContent style={styles.body}>
      <Text style={styles.question}>{questionLabel}</Text>

      <View style={styles.rows}>
        {statOwrel.shares.map((entry) => (
          <AnswerShareRow
            key={entry.option.id}
            label={statLabelOf(entry.option)}
            share={entry.share}
            picked={entry.picked}
          />
        ))}
      </View>
    </CardContent>
  </Card>
);
