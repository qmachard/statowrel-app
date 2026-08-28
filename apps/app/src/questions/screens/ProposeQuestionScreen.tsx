import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation } from '@react-navigation/native';
import {
  QUESTION_LABEL_MAX_LENGTH,
  QUESTION_MAX_OPTIONS,
  QUESTION_MIN_OPTIONS,
  QUESTION_OPTION_LABEL_MAX_LENGTH,
  QUESTION_OPTION_STAT_LABEL_MAX_LENGTH,
  QUESTION_STATCOIN_COST,
  type ProposeQuestionResult,
} from '@statowrel/models';
import { useState } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { SuccessCheck } from '@/components/animations';
import { Plus, X } from '@/components/icons';
import { TextField } from '@/components/TextField';
import { borderWidth, colors, fontSize, fonts, spacing } from '@/design/tokens';
import { amountLabel, spokenAmountLabel } from '@/lib/statcoins';
import { proposeQuestion } from '@/questions/data/proposeQuestion';
import { proposalFailure } from '@/questions/errors';
import { type ProposeQuestionValues, emptyOption, proposeQuestionSchema } from '@/questions/schemas';

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardAvoider: {
    flex: 1,
  },
  // The vertical paddings are completed by the safe-area insets at render time
  // — see the `contentContainerStyle` array.
  content: {
    gap: spacing(6),
    padding: spacing(6),
  },
  close: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  title: {
    fontFamily: fonts.head,
    fontSize: fontSize['2xl'],
    textTransform: 'uppercase',
    color: colors.foreground,
  },
  section: {
    gap: spacing(3),
  },
  // One step up from the field labels under it — « TA QUESTION » and
  // « RÉPONSES » name the parts of the form, « Réponse 1 » names a line inside
  // one of them, and nothing else on the screen may read as their equal.
  sectionTitle: {
    fontFamily: fonts.head,
    fontSize: fontSize.base,
    textTransform: 'uppercase',
    color: colors.foreground,
  },
  // Two label-and-field pairs, set further apart than a label is from the field
  // it names — which is the whole of the grouping: « Réponse 1 » belongs to the
  // input under it, « Tu es un.e » to its own.
  option: {
    gap: spacing(4),
  },
  pair: {
    gap: spacing(2),
  },
  // Every answer but the first is preceded by a rule, so the block reads as one
  // list rather than as N stacked forms.
  optionSeparated: {
    borderTopWidth: borderWidth,
    borderTopColor: colors.border,
    paddingTop: spacing(4),
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing(2),
  },
  // Both labels of an answer take this, and neither takes `TextField`'s own:
  // two label treatments inside one block read as a mistake rather than as a
  // hierarchy. The rank is carried by the section titles above, a size up and
  // in the head face. Which is why the two fields are label-less and named
  // through `accessibilityLabel` instead — the screen owns its labels here.
  optionTitle: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.sm,
    color: colors.foreground,
  },
  error: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    color: colors.destructive,
  },
  outcome: {
    alignItems: 'center',
    gap: spacing(4),
    paddingTop: spacing(10),
  },
  outcomeMessage: {
    textAlign: 'center',
    fontFamily: fonts.sans,
    fontSize: fontSize.base,
    color: colors.foreground,
  },
  outcomeBalance: {
    textAlign: 'center',
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.sm,
    color: colors['muted-foreground'],
  },
});

/**
 * Writing a question and paying for it — docs/prd.md §4.7, behind the
 * `ProposeQuestionCard` under the calendar.
 *
 * **A full-screen modal, not a sheet.** It was a `formSheet` sized by its own
 * content, like the invitation, and that was the wrong shape: this form *grows*
 * — six answers are twelve inputs — so the sheet either asked for more height
 * than the phone had or capped itself and scrolled inside a detent that kept
 * re-measuring. A form the keyboard shares the screen with wants the whole
 * screen.
 *
 * The keyboard is the other half of that: the fields sit inside a scroll view
 * under a `KeyboardAvoidingView`, the pattern the sign-in screens already use,
 * so the last answer is still reachable with the keyboard up.
 *
 * **The interface says what it is and stops.** There is no paragraph explaining
 * the StatOwrel or what moderation will do with the question: the headings name
 * the parts, the placeholders show the shape of an answer, and the price sits
 * on the button that spends it. The app explains the currency once, on the card
 * that opens this screen (docs/prd.md §5.2 point 6), and does not explain it
 * again here.
 *
 * The app writes nothing itself: `questions-proposeQuestion` debits the wallet
 * and writes the question in one transaction, so everything that can go wrong
 * comes back as a `functions/*` code translated by `src/questions/errors.ts` —
 * including the one refusal worth its own sentence, an empty wallet.
 */
export const ProposeQuestionScreen = () => {
  const navigation = useNavigation();
  // **Both edges are this screen's own.** A `fullScreenModal` covers the whole
  // screen on both platforms — under the status bar on iOS, edge to edge on
  // Android — which is exactly where the daily question's page sheet differs:
  // that one already hangs below the bar and takes no top inset. Spent as plain
  // padding rather than through `SafeAreaView`, whose own padding is computed
  // natively and lands after the first layout (see `useSheetBottomInset`).
  const insets = useSafeAreaInsets();
  const [ failure, setFailure ] = useState<string | null>(null);
  const [ result, setResult ] = useState<ProposeQuestionResult | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProposeQuestionValues>({
    resolver: zodResolver(proposeQuestionSchema),
    defaultValues: {
      label: '',
      options: Array.from({ length: QUESTION_MIN_OPTIONS }, emptyOption),
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'options' });

  const onSubmit = handleSubmit(async (values) => {
    setFailure(null);

    try {
      setResult(await proposeQuestion(values));
    } catch (caught) {
      setFailure(proposalFailure(caught));
    }
  });

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView style={styles.keyboardAvoider} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: spacing(4) + insets.top, paddingBottom: spacing(6) + insets.bottom },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.close}>
            <Button label="Fermer" variant="outline" size="icon-sm" icon={X} onPress={() => navigation.goBack()} />
          </View>

          {result === null ? (
            <>
              <Text style={styles.title}>Pose ta question</Text>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Ta question</Text>

                <Controller
                  control={control}
                  name="label"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextField
                      accessibilityLabel="Ta question"
                      placeholder="Ton dentifrice, tu le presses…"
                      maxLength={QUESTION_LABEL_MAX_LENGTH}
                      value={value}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      error={errors.label?.message}
                    />
                  )}
                />
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Réponses ({QUESTION_MIN_OPTIONS} à {QUESTION_MAX_OPTIONS})
                </Text>

                {fields.map((field, index) => (
                  <View key={field.id} style={[ styles.option, index > 0 ? styles.optionSeparated : null ]}>
                    <View style={styles.pair}>
                      <View style={styles.optionHeader}>
                        <Text style={styles.optionTitle}>Réponse {index + 1}</Text>

                        {/* Always here, disabled at the floor rather than
                            taken away. The floor is two — a form that lets
                            itself be emptied only to refuse the result says no
                            twice — but a button that comes and goes with the
                            third answer moves every row it is added to, and a
                            row that shifts under the finger is worse than a
                            control that says it is unavailable. */}
                        <Button
                          label={`Retirer la réponse ${index + 1}`}
                          variant="ghost"
                          size="icon-sm"
                          icon={X}
                          disabled={fields.length <= QUESTION_MIN_OPTIONS}
                          onPress={() => remove(index)}
                        />
                      </View>

                      <Controller
                        control={control}
                        name={`options.${index}.label`}
                        render={({ field: { onChange, onBlur, value } }) => (
                          <TextField
                            accessibilityLabel={`Réponse ${index + 1}`}
                            placeholder="Par le bout"
                            maxLength={QUESTION_OPTION_LABEL_MAX_LENGTH}
                            value={value}
                            onBlur={onBlur}
                            onChangeText={onChange}
                            error={errors.options?.[index]?.label?.message}
                          />
                        )}
                      />
                    </View>

                    <View style={styles.pair}>
                      {/* The sentence names the StatOwrel better than the word
                          would: the result screen finishes exactly this phrase
                          with what is typed under it (docs/prd.md §5.5). */}
                      <Text style={styles.optionTitle}>Tu es un.e</Text>

                      <Controller
                        control={control}
                        name={`options.${index}.stat_label`}
                        render={({ field: { onChange, onBlur, value } }) => (
                          <TextField
                            accessibilityLabel={`Tu es un.e, réponse ${index + 1}, facultatif`}
                            placeholder="méthodique"
                            maxLength={QUESTION_OPTION_STAT_LABEL_MAX_LENGTH}
                            value={value}
                            onBlur={onBlur}
                            onChangeText={onChange}
                            error={errors.options?.[index]?.stat_label?.message}
                          />
                        )}
                      />
                    </View>
                  </View>
                ))}

                {fields.length < QUESTION_MAX_OPTIONS ? (
                  <Button
                    label="Ajouter une réponse"
                    variant="outline"
                    icon={Plus}
                    onPress={() => append(emptyOption())}
                  />
                ) : null}
              </View>

              {failure === null ? null : <Text style={styles.error}>{failure}</Text>}

              {/* The price stays in the trailing slot, as on the card that opens
                  this screen: it is what the action costs, not what it is. */}
              <Button
                label="Poser ma question"
                trailingLabel={amountLabel(QUESTION_STATCOIN_COST)}
                accessibilityLabel={`Poser ma question, ${spokenAmountLabel(QUESTION_STATCOIN_COST)}`}
                loading={isSubmitting}
                onPress={onSubmit}
              />
            </>
          ) : (
            <View style={styles.outcome}>
              <SuccessCheck size="2xl" />

              <Text style={styles.outcomeMessage}>
                Ta question part en modération. Tu sauras vite si elle est retenue.
              </Text>

              <Text
                style={styles.outcomeBalance}
                accessibilityLabel={`Il te reste ${spokenAmountLabel(result.statcoin_balance)}`}
              >
                Il te reste {amountLabel(result.statcoin_balance)}
              </Text>

              <Button label="Fermer" onPress={() => navigation.goBack()} />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};
