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
import { hapticValidation } from '@/lib/haptics';

import { DEMO_DAY_LABEL, DEMO_DISCLAIMER, DONE } from '../copy';

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
  /** The way out through the front door: it closes the carousel and lands on the app. */
  onFinish: () => void;
}

/**
 * The daily question, posed to somebody who does not have an account yet: the
 * same red sheet, the same double tap of docs/prd.md §4.3, the same result of
 * §5.5 under it — read from the real `demo` question in Firestore, shares and
 * all.
 *
 * **It writes nothing.** A demo question was never broadcast, so
 * `firestore.rules` would refuse an answer under it anyway; the pick stays in
 * this component's state and the StatOwrel is computed from the tally the
 * question already carries (`npm run seed-demo-question` is what puts one
 * there — an empty one would open the visitor on « 100% des gens »). Which is
 * also why nothing here goes near `answerStore` or the calendar: there is no
 * day, no streak and no account to move.
 *
 * The friends of §4.5 are the one block missing, and on purpose: nobody has
 * answered a question that never ran, and the real ones are what the button at
 * the bottom lands on.
 */
export const DemoQuestionSheet = ({ visible, question, onClose, onFinish }: DemoQuestionSheetProps) => {
  const [ pickedId, setPickedId ] = useState<string | null>(null);
  const [ celebrating, setCelebrating ] = useState(false);

  const { selectedId, pick } = useDoubleTapAnswer((optionId) => {
    hapticValidation();
    setPickedId(optionId);
    setCelebrating(true);
  });

  const statOwrel = pickedId === null ? null : buildStatOwrel(question, question.answer_counts, pickedId);

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

            <Button label={DONE} onPress={onFinish} />
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
