import type { QuestionData } from '@statowrel/models';
import { X } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { SuccessCircle } from '@/components/animations';
import { AnswerRecap } from '@/daily-question/components/AnswerRecap';
import { QuestionOption, letterOf } from '@/daily-question/components/QuestionOption';
import { StatOwrelHeadline } from '@/daily-question/components/StatOwrelHeadline';
import { buildStatOwrel } from '@/daily-question/helpers/statowrel';
import { FOREGROUND } from '@/daily-question/helpers/surface';
import { useDoubleTapAnswer } from '@/daily-question/helpers/useDoubleTapAnswer';
import { fontSize, fonts, spacing } from '@/design/tokens';

import { rememberDemoAnswer } from '../data/demoAnswerStore';
import { hapticValidation } from '@/lib/haptics';

import { DEMO_DAY_LABEL, DEMO_DISCLAIMER, SIGN_UP } from '../copy';

/** The demo wears the accent red of today's question — it is the one it imitates. */
const SURFACE = 'accent';

const styles = StyleSheet.create({
  content: {
    gap: spacing(5),
    padding: spacing(6),
    paddingTop: spacing(4),
  },
  close: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  question: {
    fontFamily: fonts.head,
    fontSize: fontSize['2xl'],
  },
  options: {
    gap: spacing(4),
  },
  disclaimer: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
  },
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

export interface DemoQuestionSheetProps {
  visible: boolean;
  question: QuestionData;
  onClose: () => void;
  /** The way out through the front door — the carousel's own call to action. */
  onSignUp: () => void;
}

/**
 * The daily question, posed to somebody who does not have an account yet: the
 * same red sheet, the same double tap of docs/prd.md §4.3, the same result of
 * §5.5 under it — read from the real `demo` question in Firestore, shares and
 * all.
 *
 * **The pick is kept, not written.** There is no account here — the carousel
 * runs before sign-up — and an answer's document id *is* its author's UID, so
 * it waits on the phone (`demoAnswerStore`) and `useDemoAnswerFlush` writes it
 * at the first sign-in. It then counts in the question's `answer_counts` and in
 * nothing else: a demo is not a day, so no calendar entry, no streak, no
 * `answers_count` — which is also why nothing here goes near `answerStore`.
 *
 * The shares it shows come from the tally read with the question
 * (`npm run seed-demo-question` is what seeds one; an empty map would open on
 * « 100% des gens »), so the result is right whether or not the pick is ever
 * flushed.
 *
 * The friends of §4.5 are the one block missing, and on purpose: they are what
 * the sign-up at the bottom is for.
 */
export const DemoQuestionSheet = ({ visible, question, onClose, onSignUp }: DemoQuestionSheetProps) => {
  const [ pickedId, setPickedId ] = useState<string | null>(null);
  const [ celebrating, setCelebrating ] = useState(false);

  const { selectedId, pick } = useDoubleTapAnswer((optionId) => {
    hapticValidation();
    setPickedId(optionId);
    setCelebrating(true);

    // Not awaited: the result is already on screen, and this only decides
    // whether the tally eventually carries this pick.
    void rememberDemoAnswer(optionId);
  });

  // Always pending: the pick made here is written at the first sign-in
  // (`useDemoAnswerFlush`), so the tally on screen is by construction the one
  // from before this visitor answered — there is no beat to wait out, and no
  // marker to read.
  const statOwrel = pickedId === null ? null : buildStatOwrel(question, question.answer_counts, pickedId, true);

  return (
    <BottomSheet visible={visible} label="Question démo" surface={SURFACE} onDismiss={onClose}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.close}>
          <Button label="Fermer" variant="outline" size="icon-sm" icon={X} onPress={onClose} />
        </View>

        {statOwrel === null ? (
          <>
            <Text style={[ styles.question, FOREGROUND[SURFACE] ]}>{question.label}</Text>

            <View style={styles.options}>
              {question.options.map((option, index) => (
                <QuestionOption
                  key={option.id}
                  letter={letterOf(index)}
                  label={option.label}
                  selected={selectedId === option.id}
                  onPress={() => pick(option.id)}
                />
              ))}
            </View>
          </>
        ) : (
          <>
            <StatOwrelHeadline statOwrel={statOwrel} surface={SURFACE} dateLabel={DEMO_DAY_LABEL} />

            <AnswerRecap questionLabel={question.label} statOwrel={statOwrel} />

            <Text style={[ styles.disclaimer, FOREGROUND[SURFACE] ]}>{DEMO_DISCLAIMER}</Text>

            <Button label={SIGN_UP} onPress={onSignUp} />
          </>
        )}
      </ScrollView>

      {celebrating ? (
        <View style={styles.celebration} pointerEvents="none">
          <SuccessCircle size="xl" onFinish={() => setCelebrating(false)} />
        </View>
      ) : null}
    </BottomSheet>
  );
};
