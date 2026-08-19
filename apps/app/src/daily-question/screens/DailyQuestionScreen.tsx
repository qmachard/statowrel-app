import { type RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { dailyQuestionDateKey } from '@statowrel/models';
import { X } from 'lucide-react-native';
import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, type TextStyle, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { SuccessCircle } from '@/components/animations';
import { QuestionOption } from '@/daily-question/components/QuestionOption';
import { rememberAnswer } from '@/daily-question/data/answerStore';
import { submitAnswer } from '@/daily-question/data/submitAnswer';
import { type DailyQuestionStatus, useDailyQuestion } from '@/daily-question/data/useDailyQuestion';
import { useAuth } from '@/auth/AuthContext';
import { colors, fontSize, fonts, spacing } from '@/design/tokens';
import { hapticSelection, hapticValidation } from '@/lib/haptics';
import { formatDayLabel, fromDateKey, toDateKey } from '@/lib/dates';
import type { RootStackParamList } from '@/navigation/types';
import { invalidateCalendarMonth } from '@/stats/data/useStatsData';

/** What a day that carries no answerable question has to say for itself. */
const DEAD_END: Partial<Record<DailyQuestionStatus, string>> = {
  unpublished: 'La question du jour n’est pas encore tombée. Elle arrive à 7h.',
  missing: 'Pas de question ce jour-là.',
  error: 'Impossible de charger la question. Réessaie dans un instant.',
};

/**
 * The guard of docs/prd.md §4.3: a second tap landing sooner than this is an
 * accidental double tap, not a validation. The answer is final, so the cost of
 * ignoring one real tap is a tap; the cost of taking a stray one is a wrong
 * answer nobody can undo.
 */
const VALIDATION_DELAY_MS = 150;

/**
 * The sheet wears the colour of the calendar cell that opens it (docs/prd.md
 * §5.2): the accent red of an unanswered today, the primary yellow of a day
 * already answered.
 */
type Surface = 'accent' | 'primary';

/** `A`, `B`, `C`… for the option at that rank — a question carries 2 to 6 (docs/prd.md §4.2). */
const letterOf = (index: number) => String.fromCharCode('A'.charCodeAt(0) + index);

/**
 * « Stat du jour », or « Stat du mardi 12 août » on a past day — the sheet's own
 * heading, which is why the day no longer needs a line of its own above it.
 *
 * `formatDayLabel` capitalises its first letter for a standalone label; here it
 * runs on inside a sentence.
 */
const headingOf = (date: string, isToday: boolean): string => {
  if (isToday) {
    return 'Stat du jour';
  }

  const day = formatDayLabel(fromDateKey(date));

  return `Stat du ${day.charAt(0).toLowerCase()}${day.slice(1)}`;
};

const styles = StyleSheet.create({
  // No `flex: 1` anywhere on the way down: the sheet's detent is
  // `fitToContents`, so it measures this column and a stretched child would
  // make it measure the whole screen instead.
  content: {
    gap: spacing(5),
    padding: spacing(6),
    paddingTop: spacing(4),
  },
  // Heading and question read as one block, set apart from the options below.
  prompt: {
    gap: spacing(3),
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing(4),
  },
  heading: {
    flex: 1,
    fontFamily: fonts.head,
    fontSize: fontSize.xl,
    textTransform: 'uppercase',
  },
  // `fonts.head` at body size is this app's bold — Space Grotesk ships in a
  // single weight, so a `fontWeight` here would only ask for a face that isn't
  // loaded.
  question: {
    fontFamily: fonts.head,
    fontSize: fontSize.base,
  },
  options: {
    gap: spacing(4),
  },
  // On either coloured surface `muted-foreground` is unreadable, and the palette
  // has no muted token for one: every text here takes the surface's own
  // foreground and stays secondary by size alone.
  message: {
    fontFamily: fonts.sans,
    fontSize: fontSize.base,
  },
  credit: {
    textAlign: 'center',
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
  },
  // Absolutely positioned so playing it never resizes the sheet: the detent is
  // `fitToContents` and would otherwise jump the moment the answer lands.
  celebration: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const SURFACE = StyleSheet.create({
  accent: { backgroundColor: colors.accent },
  primary: { backgroundColor: colors.primary },
}) satisfies Record<Surface, ViewStyle>;

const FOREGROUND = StyleSheet.create({
  accent: { color: colors['accent-foreground'] },
  primary: { color: colors['primary-foreground'] },
}) satisfies Record<Surface, TextStyle>;

const Message = ({ children, surface }: { children: ReactNode; surface: Surface }) => (
  <Text style={[ styles.message, FOREGROUND[surface] ]}>{children}</Text>
);

/**
 * One day's question — today's by default, any past day when the route carries a
 * `date` (docs/prd.md §5.4): « Stat du jour » as the heading — « Stat du mardi
 * 12 août » on a past day — the question under it, then the options in their
 * fixed order, each behind its quizz letter.
 *
 * The sheet is sized by this content (see `RootNavigator`), which is why the
 * options sit in a plain column rather than a scroll view: a short question
 * gets a short sheet. It also wears the colour of the calendar cell that opens
 * it — accent while today is unanswered, primary once it is answered.
 *
 * **Answering is the double tap of docs/prd.md §4.3**: the first tap selects,
 * the second one on the same option writes
 * `v1_daily_questions/{date}/v1_daily_question_answers/{uid}` — document id =
 * the author's UID, which is what makes one answer per person per day a
 * property of the data. There is no « Valider » button; tapping another option
 * only moves the selection. The success animation plays over the sheet the
 * moment the write lands, and the options settle into their answered state
 * behind it. The StatOwrel card the sheet should then flip to (§5.5) is what
 * comes next.
 */
export const DailyQuestionScreen = () => {
  const navigation = useNavigation();
  const { params } = useRoute<RouteProp<RootStackParamList, 'DailyQuestion'>>();
  const { user } = useAuth();

  // No param means today, and today is Paris' day, not the device's — the day
  // key *is* the document id (docs/architecture.md).
  const date = params?.date ?? dailyQuestionDateKey(new Date());
  const { status, dailyQuestion, question, answer, authorName } = useDailyQuestion(date);

  const [ selectedId, setSelectedId ] = useState<string | null>(null);
  // False for the first `VALIDATION_DELAY_MS` of a selection — the guard above.
  const [ armed, setArmed ] = useState(false);
  const [ submitting, setSubmitting ] = useState(false);
  const [ celebrating, setCelebrating ] = useState(false);
  const [ failure, setFailure ] = useState<string | null>(null);
  const armTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (armTimer.current !== null) {
      clearTimeout(armTimer.current);
    }
  }, []);

  const isToday = date === toDateKey(new Date());
  const deadEnd = DEAD_END[status];

  // Red only while today is still open — the moment it is answered it turns
  // yellow, exactly as its calendar cell does.
  const surface: Surface = isToday && answer === null ? 'accent' : 'primary';

  // The sheet's own background, behind the content this screen lays out. Set
  // here rather than in `RootNavigator` because the navigator has no way of
  // knowing whether the day has been answered.
  useLayoutEffect(() => {
    navigation.setOptions({ contentStyle: SURFACE[surface] });
  }, [ navigation, surface ]);

  const validate = async (optionId: string) => {
    if (user === null || dailyQuestion === null) {
      return;
    }

    setSubmitting(true);
    setFailure(null);
    hapticValidation();

    try {
      const written = await submitAnswer({ userId: user.uid, date, optionId, dailyQuestion });

      // Both this sheet and the Stats banner underneath read the day through
      // `useDailyQuestion`, and both flip on this.
      rememberAnswer(written);
      // The answer trigger rewrites the month behind the app's back, so the
      // Stats screen underneath must not go on serving the copy it cached.
      invalidateCalendarMonth(user.uid, date);
      setSelectedId(null);
      setArmed(false);
      setCelebrating(true);
    } catch (error) {
      console.warn('[daily-question] could not save the answer', date, error);
      setFailure('Ta réponse n’est pas partie. Réessaie dans un instant.');
    } finally {
      setSubmitting(false);
    }
  };

  const pick = (optionId: string) => {
    if (selectedId !== optionId) {
      // Changing one's mind never validates — it only moves the selection, and
      // re-arms the guard from scratch.
      setSelectedId(optionId);
      setArmed(false);
      hapticSelection();

      if (armTimer.current !== null) {
        clearTimeout(armTimer.current);
      }

      armTimer.current = setTimeout(() => setArmed(true), VALIDATION_DELAY_MS);

      return;
    }

    if (armed) {
      void validate(optionId);
    }
  };

  // The choice is final (docs/prd.md §4.2), so an answered day stops taking
  // taps — and so does a day still writing one.
  const answerable = status === 'ready' && user !== null && answer === null && !submitting;

  return (
    <SafeAreaView style={SURFACE[surface]} edges={[ 'bottom' ]}>
      <View style={styles.content}>
        <View style={styles.prompt}>
          <View style={styles.head}>
            <Text style={[ styles.heading, FOREGROUND[surface] ]}>{headingOf(date, isToday)}</Text>
            <Button label="Fermer" variant="outline" size="icon-sm" icon={X} onPress={() => navigation.goBack()} />
          </View>

          {question === null ? null : (
            <Text style={[ styles.question, FOREGROUND[surface] ]}>{question.label}</Text>
          )}
        </View>

        {status === 'loading' ? <ActivityIndicator size="large" /> : null}

        {deadEnd ? <Message surface={surface}>{deadEnd}</Message> : null}

        {question === null ? null : (
          <View style={styles.options}>
            {question.options.map((option, index) => (
              <QuestionOption
                key={option.id}
                letter={letterOf(index)}
                label={option.label}
                picked={answer?.option_id === option.id}
                dimmed={answer !== null && answer.option_id !== option.id}
                selected={selectedId === option.id}
                onPress={answerable ? () => pick(option.id) : undefined}
              />
            ))}
          </View>
        )}

        {failure === null ? null : <Message surface={surface}>{failure}</Message>}

        {authorName === null ? null : (
          <Text style={[ styles.credit, FOREGROUND[surface] ]}>proposée par @{authorName}</Text>
        )}

        {celebrating ? (
          <View style={styles.celebration} pointerEvents="none">
            <SuccessCircle size="xl" onFinish={() => setCelebrating(false)} />
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
};
