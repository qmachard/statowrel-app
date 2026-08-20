import { type RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { dailyQuestionDateKey } from '@statowrel/models';
import { X } from 'lucide-react-native';
import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, type TextStyle, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { SuccessCircle } from '@/components/animations';
import { QuestionOption } from '@/daily-question/components/QuestionOption';
import { StatOwrelCard } from '@/daily-question/components/StatOwrelCard';
import { rememberAnswer } from '@/daily-question/data/answerStore';
import { submitAnswer } from '@/daily-question/data/submitAnswer';
import { type DailyQuestionStatus, useDailyQuestion } from '@/daily-question/data/useDailyQuestion';
import { buildStatOwrel } from '@/daily-question/helpers/statowrel';
import { useAuth } from '@/auth/AuthContext';
import { colors, fontSize, fonts, spacing } from '@/design/tokens';
import { hapticSelection, hapticValidation } from '@/lib/haptics';
import { formatDayLabel, fromDateKey, toDateKey } from '@/lib/dates';
import type { RootStackParamList } from '@/navigation/types';

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
 * The sheet wears the colour of the day it shows: the accent red of today, the
 * primary yellow of a past one.
 *
 * Deliberately **not** a function of the answer. Flipping the whole sheet from
 * red to yellow under the success animation reads as a second event competing
 * with it, and the content flipping to the StatOwrel card is already what says
 * the answer landed. The calendar cell behind still goes yellow — that is the
 * calendar's own story about the day, told once the sheet is gone.
 */
type Surface = 'accent' | 'primary';

/** `A`, `B`, `C`… for the option at that rank — a question carries 2 to 6 (docs/prd.md §4.2). */
const letterOf = (index: number) => String.fromCharCode('A'.charCodeAt(0) + index);

const styles = StyleSheet.create({
  // No `flex: 1` anywhere on the way down: the sheet's detent is
  // `fitToContents`, so it measures this column and a stretched child would
  // make it measure the whole screen instead.
  content: {
    gap: spacing(5),
    padding: spacing(6),
    paddingTop: spacing(4),
  },
  // The way out and the question read as one block, set apart from the options
  // below.
  prompt: {
    gap: spacing(3),
  },
  // The close button sits on its own line, pushed right — a row of its own
  // rather than a corner of the question's, so the question below it runs the
  // full width of the sheet whatever its length.
  close: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  // The question *is* the sheet's title — there is nothing else worth reading
  // at the top of it, and no label above it saying what one already sees.
  question: {
    fontFamily: fonts.head,
    fontSize: fontSize['2xl'],
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
 * `date` (docs/prd.md §5.4): the way out on its own line, the question under it
 * as the sheet's title, then the options in their fixed order, each behind its
 * quizz letter. No label above the question saying it is one.
 *
 * The sheet is sized by this content (see `RootNavigator`), which is why the
 * options sit in a plain column rather than a scroll view: a short question
 * gets a short sheet. It wears accent for today and primary for a past day, and
 * keeps that colour through the answer.
 *
 * **Answering is the double tap of docs/prd.md §4.3**: the first tap selects,
 * the second one on the same option writes
 * `v1_questions/{question_id}/v1_daily_question_answers/{uid}` — document id =
 * the author's UID, which is what makes one answer per person per day a
 * property of the data. There is no « Valider » button; tapping another option
 * only moves the selection.
 *
 * **An answered day is the StatOwrel card of §5.5**, not a row of dimmed
 * options: the sheet's content flips to it the moment the answer lands, with
 * the success animation playing over it, and reopening the day from the
 * calendar lands straight on it. The question moves inside the card then — it
 * carries its own recap — so the sheet never shows it twice.
 */
export const DailyQuestionScreen = () => {
  const navigation = useNavigation();
  const { params } = useRoute<RouteProp<RootStackParamList, 'DailyQuestion'>>();
  const { user } = useAuth();

  // No param means today, and today is Paris' day, not the device's — the day
  // key *is* the document id (docs/architecture.md).
  const date = params?.date ?? dailyQuestionDateKey(new Date());
  const { status, question, questionId, answer, authorName } = useDailyQuestion(date);

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

  const surface: Surface = isToday ? 'accent' : 'primary';

  // The sheet's own background, behind the content this screen lays out. Set
  // here rather than in `RootNavigator` because the navigator has no way of
  // knowing whether the day has been answered.
  useLayoutEffect(() => {
    navigation.setOptions({ contentStyle: SURFACE[surface] });
  }, [ navigation, surface ]);

  const validate = async (optionId: string) => {
    if (user === null || question === null || questionId === null) {
      return;
    }

    setSubmitting(true);
    setFailure(null);
    hapticValidation();

    try {
      const written = await submitAnswer({ userId: user.uid, questionId, question, optionId });

      // The sheet flips on its own answer subscription; this is for the Stats
      // banner underneath, which reads the calendar month the trigger has not
      // written yet.
      rememberAnswer(written);
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

  // The reward of docs/prd.md §5.5, recomputed on every `answer_counts` the
  // question subscription hands over: the card's rarity is that map's shape at
  // display time, so it keeps moving while the day's answers come in.
  const statOwrel = question === null || answer === null
    ? null
    : buildStatOwrel(question, question.answer_counts, answer.option_id);

  return (
    <SafeAreaView style={SURFACE[surface]} edges={[ 'bottom' ]}>
      <View style={styles.content}>
        <View style={styles.prompt}>
          <View style={styles.close}>
            <Button label="Fermer" variant="outline" size="icon-sm" icon={X} onPress={() => navigation.goBack()} />
          </View>

          {question === null || answer !== null ? null : (
            <Text style={[ styles.question, FOREGROUND[surface] ]}>{question.label}</Text>
          )}
        </View>

        {status === 'loading' ? <ActivityIndicator size="large" /> : null}

        {deadEnd ? <Message surface={surface}>{deadEnd}</Message> : null}

        {statOwrel === null || question === null ? null : (
          <StatOwrelCard
            statOwrel={statOwrel}
            questionLabel={question.label}
            dateLabel={formatDayLabel(fromDateKey(date))}
            authorName={authorName}
          />
        )}

        {question === null || answer !== null ? null : (
          <View style={styles.options}>
            {question.options.map((option, index) => (
              <QuestionOption
                key={option.id}
                letter={letterOf(index)}
                label={option.label}
                selected={selectedId === option.id}
                onPress={answerable ? () => pick(option.id) : undefined}
              />
            ))}
          </View>
        )}

        {failure === null ? null : <Message surface={surface}>{failure}</Message>}

        {authorName === null || answer !== null ? null : (
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
