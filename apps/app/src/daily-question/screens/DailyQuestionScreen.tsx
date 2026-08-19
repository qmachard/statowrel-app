import { type RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { dailyQuestionDateKey } from '@statowrel/models';
import { X } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { QuestionOption } from '@/daily-question/components/QuestionOption';
import { type DailyQuestionStatus, useDailyQuestion } from '@/daily-question/data/useDailyQuestion';
import { colors, fontSize, fonts, spacing } from '@/design/tokens';
import { formatDayLabel, fromDateKey, toDateKey } from '@/lib/dates';
import type { RootStackParamList } from '@/navigation/types';

/** What a day that carries no answerable question has to say for itself. */
const DEAD_END: Partial<Record<DailyQuestionStatus, string>> = {
  unpublished: 'La question du jour n’est pas encore tombée. Elle arrive à 7h.',
  missing: 'Pas de question ce jour-là.',
  error: 'Impossible de charger la question. Réessaie dans un instant.',
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  // The title block is outside the ScrollView: past four options the list
  // scrolls under a question that stays put (docs/prd.md §5.4).
  head: {
    gap: spacing(6),
    padding: spacing(6),
    paddingBottom: spacing(4),
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing(4),
  },
  date: {
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    textTransform: 'uppercase',
    color: colors['muted-foreground'],
  },
  question: {
    fontFamily: fonts.head,
    fontSize: fontSize['3xl'],
    color: colors.foreground,
  },
  options: {
    gap: spacing(4),
    paddingHorizontal: spacing(6),
    paddingBottom: spacing(8),
  },
  message: {
    fontFamily: fonts.sans,
    fontSize: fontSize.base,
    color: colors['muted-foreground'],
  },
  credit: {
    paddingTop: spacing(2),
    textAlign: 'center',
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    color: colors['muted-foreground'],
  },
});

const Message = ({ children }: { children: ReactNode }) => (
  <Text style={styles.message}>{children}</Text>
);

/**
 * One day's question — today's by default, any past day when the route carries a
 * `date` (docs/prd.md §5.4): the date in micro-text, the question very large in
 * `fonts.head`, then the options in their fixed order.
 *
 * Answering is not wired yet — the double tap of §4.3 and the StatOwrel card it
 * flips to (§5.5) come next. Until then the sheet is dismissable even for
 * today's unanswered question, which §5.4 wants blocking: trapping the user on
 * a screen with no way to answer would be worse than letting them out.
 */
export const DailyQuestionScreen = () => {
  const navigation = useNavigation();
  const { params } = useRoute<RouteProp<RootStackParamList, 'DailyQuestion'>>();

  // No param means today, and today is Paris' day, not the device's — the day
  // key *is* the document id (docs/architecture.md).
  const date = params?.date ?? dailyQuestionDateKey(new Date());
  const { status, question, answer, authorName } = useDailyQuestion(date);

  const isToday = date === toDateKey(new Date());
  const deadEnd = DEAD_END[status];

  return (
    <SafeAreaView style={styles.safeArea} edges={[ 'top', 'bottom' ]}>
      <View style={styles.head}>
        <View style={styles.headRow}>
          <Text style={styles.date}>
            {isToday ? 'Aujourd’hui' : formatDayLabel(fromDateKey(date))}
          </Text>
          <Button label="Fermer" variant="outline" size="icon-sm" icon={X} onPress={() => navigation.goBack()} />
        </View>

        {question === null ? null : <Text style={styles.question}>{question.label}</Text>}
      </View>

      <ScrollView contentContainerStyle={styles.options}>
        {status === 'loading' ? <ActivityIndicator size="large" /> : null}

        {deadEnd ? <Message>{deadEnd}</Message> : null}

        {question?.options.map((option) => (
          <QuestionOption
            key={option.id}
            label={option.label}
            picked={answer?.option_id === option.id}
            dimmed={answer !== null && answer.option_id !== option.id}
          />
        ))}

        {authorName === null ? null : (
          <Text style={styles.credit}>proposée par {authorName}</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};
