import { type RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { JOKER_STATFLOUZZ_COST, dailyQuestionDateKey, statLabelOf } from '@statowrel/models';
import { X } from '@/components/icons';
import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { SuccessCircle } from '@/components/animations';
import { AnswerRecap } from '@/daily-question/components/AnswerRecap';
import { FriendAnswers } from '@/daily-question/components/FriendAnswers';
import { JokerButton } from '@/daily-question/components/JokerButton';
import { JokerHeadline } from '@/daily-question/components/JokerHeadline';
import { QuestionOption, letterOf } from '@/daily-question/components/QuestionOption';
import { StatOwrelHeadline } from '@/daily-question/components/StatOwrelHeadline';
import { StreakMilestoneCard } from '@/daily-question/components/StreakMilestoneCard';
import { rememberAnswer } from '@/daily-question/data/answerStore';
import { rememberJoker } from '@/daily-question/data/jokerStore';
import { jokerFailure } from '@/daily-question/data/jokerErrors';
import { armMilestoneWatch } from '@/daily-question/data/milestoneStore';
import { submitAnswer } from '@/daily-question/data/submitAnswer';
import { type DailyQuestionStatus, useDailyQuestion } from '@/daily-question/data/useDailyQuestion';
import { useStreakMilestone } from '@/daily-question/data/useStreakMilestone';
import { useFriendAnswers } from '@/daily-question/data/useFriendAnswers';
import { spendJokerCallable } from '@/daily-question/data/spendJoker';
import { buildStatOwrel } from '@/daily-question/helpers/statowrel';
import { confirmJoker } from '@/daily-question/helpers/confirmJoker';
import { useDoubleTapAnswer } from '@/daily-question/helpers/useDoubleTapAnswer';
import { FOREGROUND, SURFACE, type Surface } from '@/daily-question/helpers/surface';
import { useAuth } from '@/auth/AuthContext';
import { fontSize, fonts, spacing } from '@/design/tokens';
import { hapticValidation } from '@/lib/haptics';
import { markFriendAnswersSeen } from '@/stats/data/seenFriendAnswers';
import { formatDayLabel, fromDateKey, toDateKey } from '@/lib/dates';
import type { RootStackParamList } from '@/navigation/types';

/** What a day that carries no answerable question has to say for itself. */
const DEAD_END: Partial<Record<DailyQuestionStatus, string>> = {
  unpublished: 'La question du jour n’est pas encore tombée. Elle arrive à 7h.',
  missing: 'Pas de question ce jour-là.',
  error: 'Impossible de charger la question. Réessaie dans un instant.',
};

const styles = StyleSheet.create({
  // The modal covers the screen and this scroll view is its only scroller —
  // a nested list scrolling inside a content-sized sheet is what used to drag
  // the sheet closed on Android.
  screen: {
    flex: 1,
  },
  // The vertical paddings are completed by the safe-area insets at render
  // time — see the `contentContainerStyle` array.
  content: {
    gap: spacing(5),
    padding: spacing(6),
  },
  // The way out and the question read as one block, set apart from the options
  // below.
  prompt: {
    gap: spacing(3),
  },
  jokerBlock: {
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
  // Over the whole modal, outside the scroll view: it has to centre on the
  // screen, not on scrolled content that may run taller than it.
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
 * The modal covers the screen (see `RootNavigator`) and its content scrolls
 * inside it — the screen's scroll view is the only scroller, so a long result
 * never fights the dismiss gesture. It wears accent for today and primary for
 * a past day, and keeps that colour through the answer.
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
  const { user, profile } = useAuth();

  // Neither edge is inset by the platform: Android draws the modal
  // edge-to-edge, and iOS's page sheet reaches the bottom of the screen. The
  // top is iOS's own though — a page sheet already hangs below the status bar,
  // and adding the inset again would double it.
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'ios' ? 0 : insets.top;

  // No param means today, and today is Paris' day, not the device's — the day
  // key *is* the document id (docs/architecture.md).
  const date = params?.date ?? dailyQuestionDateKey(new Date());
  const {
    status, question, questionId, answer, ownAnswerPending, resultSettled, authorName, jokered,
  } = useDailyQuestion(date);

  const [ submitting, setSubmitting ] = useState(false);
  const [ celebrating, setCelebrating ] = useState(false);
  const [ failure, setFailure ] = useState<string | null>(null);
  const [ jokerLoading, setJokerLoading ] = useState(false);

  const isToday = date === toDateKey(new Date());
  const deadEnd = DEAD_END[status];

  // A jokered day owns the joker's violet — same colour as its calendar cell,
  // so the sheet and the cell tell the same story. `isToday` gives the accent
  // red while the day is still open, `primary` closes a past answered day.
  const surface: Surface = jokered ? 'joker' : isToday ? 'accent' : 'primary';

  // The sheet's own background, behind the content this screen lays out. Set
  // here rather than in `RootNavigator` because the navigator has no way of
  // knowing whether the day has been answered.
  useLayoutEffect(() => {
    navigation.setOptions({ contentStyle: SURFACE[surface] });
  }, [ navigation, surface ]);

  /**
   * Freezes the streak and the wallet the milestone celebration will be decided
   * against (docs/prd.md §4.6, §4.7) — see `milestoneStore`.
   *
   * Called **before** the write, on both paths. The answer trigger pays the
   * milestone server-side and the emulator runs it in milliseconds, so a
   * snapshot taken once the write has resolved may already carry the credit —
   * and a « before » that already holds the reward is a celebration that never
   * fires. No profile yet means no baseline and therefore no celebration, which
   * is the safe half: nothing is announced that cannot be proved.
   */
  const armMilestone = () => {
    if (user !== null && profile !== null) {
      armMilestoneWatch(user.uid, date, {
        streakBefore: profile.streak_count,
        earnedBefore: profile.statcoins_earned,
      });
    }
  };

  const validate = async (optionId: string) => {
    if (user === null || question === null || questionId === null) {
      return;
    }

    setSubmitting(true);
    setFailure(null);
    hapticValidation();
    armMilestone();

    try {
      const written = await submitAnswer({ userId: user.uid, questionId, question, optionId });

      // What flips the sheet to its result, and what carries the answer to the
      // Stats screen underneath — one store for both since neither is
      // subscribed to Firestore any more: it drops the answered month from the
      // calendar cache and holds the day until the answer trigger has projected
      // it, and `useDailyQuestion` reads it straight back.
      // Through `statLabelOf`, like every other reader: a StatOwrel is optional
      // (docs/prd.md §4.7), and this copy is what the calendar cell shows until
      // the answer trigger lands its own — which takes the same fallback.
      rememberAnswer(written, statLabelOf(question.options.find((option) => option.id === optionId)
        ?? { id: '', label: '', stat_label: '' }));
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

  // Spending a joker on today's still-open question, docs/prd.md §4.8. The
  // callable checks every precondition again server-side — this button is a
  // shortcut, not the check.
  const spendJoker = async () => {
    if (user === null || questionId === null) {
      return;
    }

    setJokerLoading(true);
    setFailure(null);
    hapticValidation();
    armMilestone();

    try {
      await spendJokerCallable({ question_id: questionId });
      // The joker session store flips the sheet on the tap and drops the
      // month from the calendar cache — same mechanic as `rememberAnswer`.
      rememberJoker(user.uid, date, new Date().toISOString());
      setCelebrating(true);
    } catch (error) {
      setFailure(jokerFailure(error));
    } finally {
      setJokerLoading(false);
    }
  };

  // The choice is final (docs/prd.md §4.2), so an answered day stops taking
  // taps — and so does a day still writing one, or a day passed with a joker.
  // Decided on the answer and the joker flag, never on `showingResult` below:
  // a second tap has to be refused from the instant the first one is written,
  // whatever the sheet is still showing.
  const answerable = status === 'ready' && user !== null && answer === null && !jokered && !submitting && !jokerLoading;

  // The joker button shows for today's still-open question only, and only
  // when nothing has been done on the day yet — an answered or jokered day
  // shows its result instead. `isToday` gates past days; the ready/user
  // checks mirror `answerable`.
  const jokerAvailable = isToday && status === 'ready' && user !== null && answer === null && !jokered;

  /**
   * The 21:00 reminder's shortcut (docs/prd.md §4.6): a tap on it opens this
   * day *and* raises the joker confirmation, so saving a série from a lock
   * screen is the notification and one « Passer ».
   *
   * Everything here is a re-check rather than a formality. The push is built
   * on the wallet as it stood at 21:00 and only carries `intent` to somebody
   * who could pay then, but the tap can land hours later, on another device,
   * after the day was answered or the balance spent — so the day has to be
   * open, undone, and payable *now*. Any of them false and the notification
   * simply delivered the day, which is what the other four already do.
   *
   * Fired once per mount, through a ref rather than through state: the guard
   * must not itself cause a render, and re-raising the dialog on every
   * re-render of a screen that subscribes to the question's tally would be a
   * modal nobody can dismiss. Closing the day and coming back from the
   * notification is a new mount, and a new confirmation, which is right.
   */
  const jokerIntent = params?.intent === 'joker';
  const jokerPayable = jokerAvailable && (profile?.statcoin_balance ?? 0) >= JOKER_STATFLOUZZ_COST;
  const jokerIntentRaised = useRef(false);
  // The alert's callback fires whenever the user presses « Passer », which can
  // be several renders after it went up — so the spend is reached through a ref
  // rather than captured. That also keeps the effect below off a function that
  // is rebuilt on every render, which would otherwise re-run it on every tally
  // update this screen is subscribed to.
  const spendJokerRef = useRef(spendJoker);

  // A day that carries an answer with a real option — the answer result of
  // §5.5 — as opposed to a joker (which lives on the same document with
  // `is_joker: true`, docs/prd.md §4.8).
  const answered = answer !== null && !answer.is_joker;

  // **The sheet flips once the result is whole, not the instant the answer is
  // written.** The two are a beat apart on purpose: answering reads the answer
  // back to learn whether the tally on hand already carries it, so a result
  // shown at the tap would move under the eyes of whoever just answered — by
  // exactly the one answer it had not folded in yet. `resultSettled` is the
  // hook's word on that beat, and the confirmation animation is what covers it,
  // being the one thing playing over the sheet at that moment.
  //
  // The animation ending is the other way out, and it is not a fallback so much
  // as the deadline: a read that has not landed by then is not worth holding a
  // result for, and reopening an answered day — where nothing celebrates —
  // shows it straight away rather than waiting on a read it has no reason to.
  const showingResult = answered && (resultSettled || !celebrating);

  // A jokered day flips as soon as the joker is spent — instantly, with the
  // celebration playing over the tap. Nothing to settle since a joker has no
  // tally to fold into and no `counted_at` to wait for.
  const showingJokerResult = jokered;

  // Any of the two results means the sheet is showing what happened rather
  // than what to do — hide question, options, and the joker button together.
  const showingAnyResult = showingResult || showingJokerResult;

  // The reward of docs/prd.md §5.5: the rarity is `answer_counts`' shape at
  // display time, computed from the tally as it stood when the day was opened —
  // the day is read fresh at every opening, never held live (`useDailyQuestion`).
  // `ownAnswerPending` is that hook's word on whether the tally already carries
  // this user's own answer; when it does not, `buildStatOwrel` folds it in, so
  // the card is never one answer short of the day it describes.
  const statOwrel = question === null || answer === null || !showingResult
    ? null
    : buildStatOwrel(question, question.answer_counts, answer.option_id, ownAnswerPending);

  // The friends of docs/prd.md §4.5, unlocked by one's own answer OR by a
  // joker (docs/prd.md §4.8, « joker complet »). Nothing is read before the
  // day is done, one way or the other. `jokered` beats `answer` here on the
  // beat that follows a joker — the session store flips first, the Firestore
  // read lands after.
  const friends = useFriendAnswers(questionId, answer !== null || jokered);

  // The milestone this answer — or this joker — just crossed, docs/prd.md §4.6
  // and §4.7. `null` until the answer trigger's payout shows on the profile,
  // and `null` again on every later opening of the day: the celebration belongs
  // to the moment the streak crosses, not to the day it crossed on.
  const milestone = useStreakMilestone(date);

  /**
   * Opens a friend from the day's list (docs/prd.md §5.3).
   *
   * Pushed on top of this modal rather than replacing it: the day is what the
   * friend was tapped from, and closing their screen has to land back on the
   * answers one was reading — not on Stats.
   */
  const openFriend = (friendId: string, friendUsername: string) => {
    navigation.navigate('Friend', { friendId, friendUsername });
  };

  /**
   * Where the milestone card leads (docs/prd.md §4.7) — the same full-screen
   * proposal modal the Stats screen's own card opens, pushed on top of the day
   * so closing it lands back on the result that announced it.
   */
  const openProposeQuestion = () => {
    navigation.navigate('ProposeQuestion');
  };

  // Seeing them is what clears the day's badge on the calendar (docs/prd.md
  // §5.2) — the bead was pointing at this list, so listing it is the moment it
  // has been answered. `null` until the reads land: a badge must not fall on a
  // list that failed to load.
  const listedFriendAnswers = friends.status === 'ready'
    ? friends.friends.filter((friend) => friend.optionId !== null || friend.jokered).length
    : null;
  const userId = user?.uid ?? null;

  useEffect(() => {
    if (userId !== null && listedFriendAnswers !== null) {
      markFriendAnswersSeen(userId, date, listedFriendAnswers);
    }
  }, [ userId, listedFriendAnswers, date ]);

  useEffect(() => {
    spendJokerRef.current = spendJoker;
  });

  useEffect(() => {
    if (!jokerIntent || !jokerPayable || jokerIntentRaised.current) {
      return;
    }

    jokerIntentRaised.current = true;
    confirmJoker(() => void spendJokerRef.current());
  }, [ jokerIntent, jokerPayable ]);

  return (
    <View style={[ styles.screen, SURFACE[surface] ]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: spacing(4) + topInset, paddingBottom: spacing(6) + insets.bottom },
        ]}
      >
        <View style={styles.prompt}>
          <View style={styles.close}>
            <Button label="Fermer" variant="outline" size="icon-sm" icon={X} onPress={() => navigation.goBack()} />
          </View>

          {question === null || showingAnyResult ? null : (
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

            {/*
              Under the headline and never over it (docs/prd.md §4.6): the
              StatOwrel stays what this screen is about, and the milestone is
              what the day just bought. It lands a beat later, when the payout
              shows on the profile — the result is never held for it.
            */}
            {milestone === null ? null : (
              <StreakMilestoneCard
                streak={milestone.streak}
                reward={milestone.reward}
                onPropose={openProposeQuestion}
              />
            )}

            <AnswerRecap questionLabel={question.label} statOwrel={statOwrel} />

            <FriendAnswers
              status={friends.status}
              friends={friends.friends}
              question={question}
              pickedOptionId={answer.option_id}
              surface={surface}
              onOpenFriend={openFriend}
            />
          </>
        )}

        {/*
          The joker result of docs/prd.md §4.8 — « joker complet ». No mood
          (nothing was answered) and no picked row, but the shares and the
          friends' answers do unlock, since a joker « does » the day for the
          reader side of §4.5. Structurally the same block as an answered
          day, minus the yellow.
        */}
        {question === null || !showingJokerResult ? null : (
          <>
            <JokerHeadline surface={surface} dateLabel={formatDayLabel(fromDateKey(date))} />

            {/*
              A joker advances the streak and earns the milestone it crosses
              (docs/prd.md §4.8), so the celebration belongs here too — with no
              StatOwrel above it, the card is the only reward this sheet shows.
            */}
            {milestone === null ? null : (
              <StreakMilestoneCard
                streak={milestone.streak}
                reward={milestone.reward}
                onPropose={openProposeQuestion}
              />
            )}

            <AnswerRecap
              questionLabel={question.label}
              statOwrel={null}
              shares={question.options.map((option) => {
                const total = Math.max(
                  question.options.reduce((sum, o) => sum + (question.answer_counts[o.id] ?? 0), 0),
                  1,
                );

                return {
                  optionId: option.id,
                  label: option.label,
                  share: (question.answer_counts[option.id] ?? 0) / total,
                  picked: false,
                };
              })}
            />

            <FriendAnswers
              status={friends.status}
              friends={friends.friends}
              question={question}
              pickedOptionId={null}
              surface={surface}
              onOpenFriend={openFriend}
            />
          </>
        )}

        {question === null || showingAnyResult ? null : (
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

        {jokerAvailable ? (
          <View style={styles.jokerBlock}>
            <JokerButton
              balance={profile?.statcoin_balance ?? 0}
              loading={jokerLoading}
              onConfirm={() => void spendJoker()}
            />
          </View>
        ) : null}

        {failure === null ? null : <Message surface={surface}>{failure}</Message>}

        {authorName === null ? null : (
          <Text style={[ styles.credit, FOREGROUND[surface] ]}>proposée par @{authorName}</Text>
        )}
      </ScrollView>

      {celebrating ? (
        <View style={styles.celebration} pointerEvents="none">
          <SuccessCircle size="xl" onFinish={() => setCelebrating(false)} />
        </View>
      ) : null}
    </View>
  );
};
