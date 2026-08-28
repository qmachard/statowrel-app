import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/Card';
import { borderWidth, colors, fontSize, fonts, spacing } from '@/design/tokens';
import { MyQuestionRow } from '@/questions/components/MyQuestionRow';
import { EMPTY, FAILURE } from '@/questions/copy';
import { useMyQuestions } from '@/questions/data/useMyQuestions';
import { proposalStatusOf } from '@/questions/helpers/proposalStatus';

export interface MyQuestionsCardProps {
  /** Opens the day a drawn question ran, by its `YYYY-MM-DD` key (docs/prd.md §5.4). */
  onOpenDay: (date: string) => void;
}

const styles = StyleSheet.create({
  root: {
    gap: spacing(3),
  },
  title: {
    fontFamily: fonts.head,
    fontSize: fontSize.xl,
    textTransform: 'uppercase',
    color: colors.foreground,
  },
  // Same anatomy as the friend list: the card *is* the list — no padding of its
  // own, no gap between the rows — and the separators run the full width.
  list: {
    gap: 0,
    paddingVertical: 0,
    overflow: 'hidden',
  },
  separated: {
    borderTopWidth: borderWidth,
    borderTopColor: colors.border,
  },
  state: {
    paddingHorizontal: spacing(5),
    paddingVertical: spacing(5),
  },
  empty: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    color: colors['muted-foreground'],
  },
  error: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    color: colors.destructive,
  },
});

/**
 * « Mes questions » on the Menu screen (docs/prd.md §5.3) — the other half of
 * §4.7: proposing exists on the Stats screen, this is following what became of
 * what was proposed.
 *
 * It is deliberately the friend list's twin — one surface cut into rows by
 * separators, the same empty state in the list's own place, the same failure
 * line — because the two are read one under the other on the same screen, and a
 * second list shaped differently would read as a second app.
 *
 * It carries no « Poser une question » button, unlike the friend list's own
 * invitation icon. The door is on the Stats screen, beside the wallet that pays
 * for it: a price belongs next to the balance it is taken from, and duplicating
 * the entry point here would put it next to nothing. The empty state names that
 * instead.
 */
export const MyQuestionsCard = ({ onOpenDay }: MyQuestionsCardProps) => {
  const { questions, loading, failed } = useMyQuestions();

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Mes questions</Text>

      <Card style={styles.list}>
        {loading ? (
          <View style={styles.state}>
            <ActivityIndicator color={colors.foreground} />
          </View>
        ) : null}

        {!loading && !failed && questions.length === 0 ? (
          <View style={styles.state}>
            <Text style={styles.empty}>{EMPTY}</Text>
          </View>
        ) : null}

        {questions.map((question, index) => {
          const status = proposalStatusOf(question);
          // Pulled out of the object so the null check narrows the closure below.
          const { broadcastOn } = status;

          return (
            <View key={question.id} style={index === 0 ? null : styles.separated}>
              <MyQuestionRow
                label={question.label}
                status={status}
                onPress={broadcastOn === null ? undefined : () => onOpenDay(broadcastOn)}
              />
            </View>
          );
        })}

        {failed ? (
          <View style={styles.state}>
            <Text style={styles.error}>{FAILURE}</Text>
          </View>
        ) : null}
      </Card>
    </View>
  );
};
