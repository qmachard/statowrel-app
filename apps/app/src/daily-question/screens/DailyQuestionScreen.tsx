import { type RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { dailyQuestionDateKey } from '@statowrel/models';
import { X } from 'lucide-react-native';
import { type ReactNode, useEffect, useLayoutEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { SuccessCircle } from '@/components/animations';
import { AnswerRecap } from '@/daily-question/components/AnswerRecap';
import { FriendAnswers } from '@/daily-question/components/FriendAnswers';
import { QuestionOption, letterOf } from '@/daily-question/components/QuestionOption';
import { StatOwrelHeadline } from '@/daily-question/components/StatOwrelHeadline';
import { rememberAnswer } from '@/daily-question/data/answerStore';
import { submitAnswer } from '@/daily-question/data/submitAnswer';
import { type DailyQuestionStatus, useDailyQuestion } from '@/daily-question/data/useDailyQuestion';
import { useFriendAnswers } from '@/daily-question/data/useFriendAnswers';
import { buildStatOwrel } from '@/daily-question/helpers/statowrel';
import { useDoubleTapAnswer } from '@/daily-question/helpers/useDoubleTapAnswer';
import { FOREGROUND, SURFACE, type Surface } from '@/daily-question/helpers/surface';
import { useAuth } from '@/auth/AuthContext';
import { fontSize, fonts, spacing } from '@/design/tokens';
import { hapticValidation } from '@/lib/haptics';
import { markFriendAnswersSeen } from '@/stats/data/seenFriendAnswers';
import { useSheetBottomInset } from '@/lib/useSheetBottomInset';
import { formatDayLabel, fromDateKey, toDateKey } from '@/lib/dates';
import type { RootStackParamList } from '@/navigation/types';

/** What a day that carries no answerable question has to say for itself. */
const DEAD_END: Partial<Record<DailyQuestionStatus, string>> = {
  unpublished: 'La question du jour n’est pas encore tombée. Elle arrive à 7h.',
  missing: 'Pas de question ce jour-là.',
  error: 'Impossible de charger la question. Réessaie dans un instant.',
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
 * **An answered day is the result of §5.5**, not a row of dimmed options: the
 * sheet's content flips to it the moment the answer lands, with the success
 * animation playing over it, and reopening the day from the calendar lands
 * straight on it. Three blocks, in that order — the phrase and its StatOwrel
 * straight on the sheet, the recap of the question and its shares in the only
 * card left, then the friends of §4.5. The question moves inside the recap
 * then, so the sheet never shows it twice.
 */
export const DailyQuestionScreen = () => {
  const navigation = useNavigation();
  const { params } = useRoute<RouteProp<RootStackParamList, 'DailyQuestion'>>();
  const { user } = useAuth();
  const bottomInset = useSheetBottomInset();

  // No param means today, and today is Paris' day, not the device's — the day
  // key *is* the document id (docs/architecture.md).
  const date = params?.date ?? dailyQuestionDateKey(new Date());
  const { status, question, questionId, answer, authorName, refresh } = useDailyQuestion(date);

  const [ submitting, setSubmitting ] = useState(false);
  const [ celebrating, setCelebrating ] = useState(false);
  const [ failure, setFailure ] = useState<string | null>(null);

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

      // What flips the sheet to its result, and what carries the answer to the
      // Stats screen underneath — one store for both since neither is
      // subscribed to Firestore any more: it drops the answered month from the
      // calendar cache and holds the day until the answer trigger has projected
      // it, and `useDailyQuestion` reads it straight back.
      rememberAnswer(written, question.options.find((option) => option.id === optionId)?.stat_label ?? '');
      // The card that is about to show is a percentage about everybody else:
      // it is worth one read to compute it on the day as it stands now, not as
      // it stood when the question was opened and read for the first time.
      refresh();
      setCelebrating(true);
    } catch (error) {
      console.warn('[daily-question] could not save the answer', date, error);
      setFailure('Ta réponse n’est pas partie. Réessaie dans un instant.');
    } finally {
      setSubmitting(false);
    }
  };

  const { selectedId, pick } = useDoubleTapAnswer((optionId) => {
    void validate(optionId);
  });

  // The choice is final (docs/prd.md §4.2), so an answered day stops taking
  // taps — and so does a day still writing one.
  const answerable = status === 'ready' && user !== null && answer === null && !submitting;

  // The reward of docs/prd.md §5.5: the rarity is `answer_counts`' shape at
  // display time, computed from the tally as it stood when the day was opened —
  // the day is read fresh at every opening, never held live (`useDailyQuestion`).
  // The picked option counts itself in, so the card never says « 0% » in the
  // beat between the answer and the trigger that tallies it (`buildStatOwrel`).
  const statOwrel = question === null || answer === null
    ? null
    : buildStatOwrel(question, question.answer_counts, answer.option_id);

  // The friends of docs/prd.md §4.5, unlocked by one's own answer — which is
  // what the flag says, and why nothing is read before it flips.
  const friends = useFriendAnswers(questionId, answer !== null);

  // Seeing them is what clears the day's badge on the calendar (docs/prd.md
  // §5.2) — the bead was pointing at this list, so listing it is the moment it
  // has been answered. `null` until the reads land: a badge must not fall on a
  // list that failed to load.
  const listedFriendAnswers = friends.status === 'ready'
    ? friends.friends.filter((friend) => friend.optionId !== null).length
    : null;
  const userId = user?.uid ?? null;

  useEffect(() => {
    if (userId !== null && listedFriendAnswers !== null) {
      markFriendAnswersSeen(userId, date, listedFriendAnswers);
    }
  }, [ userId, listedFriendAnswers, date ]);

  return (
    <View style={SURFACE[surface]}>
      <View style={[ styles.content, { paddingBottom: spacing(6) + bottomInset } ]}>
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

        {statOwrel === null || question === null || answer === null ? null : (
          <>
            <StatOwrelHeadline
              statOwrel={statOwrel}
              surface={surface}
              dateLabel={formatDayLabel(fromDateKey(date))}
            />

            <AnswerRecap questionLabel={question.label} statOwrel={statOwrel} />

            <FriendAnswers
              status={friends.status}
              friends={friends.friends}
              question={question}
              pickedOptionId={answer.option_id}
              surface={surface}
            />
          </>
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

        {authorName === null ? null : (
          <Text style={[ styles.credit, FOREGROUND[surface] ]}>proposée par @{authorName}</Text>
        )}

        {celebrating ? (
          <View style={styles.celebration} pointerEvents="none">
            <SuccessCircle size="xl" onFinish={() => setCelebrating(false)} />
          </View>
        ) : null}
      </View>
    </View>
  );
};
