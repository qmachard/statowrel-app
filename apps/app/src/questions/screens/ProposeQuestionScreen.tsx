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
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { Button } from '@/components/Button';
import { SuccessCheck } from '@/components/animations';
import { Plus, Trash2, X } from '@/components/icons';
import { TextField } from '@/components/TextField';
import { colors, fontSize, fonts, spacing } from '@/design/tokens';
import { amountLabel, spokenAmountLabel } from '@/lib/statcoins';
import { useSheetBottomInset } from '@/lib/useSheetBottomInset';
import { proposeQuestion } from '@/questions/data/proposeQuestion';
import { proposalFailure } from '@/questions/errors';
import { type ProposeQuestionValues, emptyOption, proposeQuestionSchema } from '@/questions/schemas';

/** What proposing does, said once above the form — the price and what follows it. */
const HELP = `Ta question passe en modération avant d’être tirée. Elle coûte ${amountLabel(QUESTION_STATCOIN_COST)}, rendus si elle est refusée.`;

/**
 * The tallest this sheet gets before its content starts scrolling inside it.
 *
 * A `fitToContents` detent measures the child it is given, so the child has to
 * be bounded or a six-option form would ask for a sheet taller than the screen
 * and get clipped instead of scrolled. Two options fit well under this and the
 * sheet stays short; past that it stops growing and the fields scroll.
 */
const MAX_SHEET_RATIO = 0.72;

const styles = StyleSheet.create({
  // No `flex: 1` anywhere on the way down — the sheet's detent is
  // `fitToContents`, and a stretched child would make it measure the whole
  // screen. Same constraint as the invitation sheet.
  content: {
    gap: spacing(5),
    padding: spacing(6),
    paddingTop: spacing(4),
  },
  close: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  header: {
    gap: spacing(2),
  },
  title: {
    fontFamily: fonts.head,
    fontSize: fontSize['2xl'],
    textTransform: 'uppercase',
    color: colors.foreground,
  },
  help: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    color: colors['muted-foreground'],
  },
  form: {
    gap: spacing(4),
  },
  options: {
    gap: spacing(3),
  },
  optionsTitle: {
    fontFamily: fonts.head,
    fontSize: fontSize.xs,
    textTransform: 'uppercase',
    color: colors.foreground,
  },
  // The two halves of an option on one line — the answer and the StatOwrel it
  // earns — because stacking them would make six options twice as tall as the
  // screen. Aligned on their bottom edge so the remove button sits on the
  // fields' own baseline rather than on their labels'.
  option: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing(2),
  },
  optionLabel: {
    flex: 1.4,
  },
  optionStatLabel: {
    flex: 1,
  },
  error: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    color: colors.destructive,
  },
  outcome: {
    alignItems: 'center',
    gap: spacing(4),
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
 * Writing a question and paying for it — docs/prd.md §4.7, and what the
 * `ProposeQuestionCard` under the calendar has been pointing at with an inert
 * button until now.
 *
 * A dismissable `formSheet` sized by its own content, like the invitation sheet
 * (§5.1): nothing is blocked on proposing a question, so navigation opens it
 * and a tap outside closes it. Unlike that one it can grow — two options are the
 * floor and six the ceiling (§4.2) — so it is capped and scrolls past the cap
 * rather than asking for a sheet taller than the phone.
 *
 * The app writes nothing itself: `firestore.rules` closed `v1_questions` to
 * every client, and `questions-proposeQuestion` debits the wallet and writes the
 * question in one transaction. So everything that can go wrong comes back as a
 * `functions/*` code, translated by `src/questions/errors.ts` and shown above
 * the button — including the one refusal worth a sentence of its own, an empty
 * wallet.
 *
 * Once the question is in, the form is replaced by what happened rather than
 * left standing under a message: the sheet had one thing to do, and the balance
 * it hands back is what says the price was really paid.
 */
export const ProposeQuestionScreen = () => {
  const navigation = useNavigation();
  const bottomInset = useSheetBottomInset();
  const { height } = useWindowDimensions();
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
    <ScrollView
      style={{ maxHeight: height * MAX_SHEET_RATIO }}
      contentContainerStyle={[ styles.content, { paddingBottom: spacing(6) + bottomInset } ]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.close}>
        <Button label="Fermer" variant="outline" size="icon-sm" icon={X} onPress={() => navigation.goBack()} />
      </View>

      {result === null ? (
        <>
          <View style={styles.header}>
            <Text style={styles.title}>Pose ta question</Text>
            <Text style={styles.help}>{HELP}</Text>
          </View>

          <View style={styles.form}>
            <Controller
              control={control}
              name="label"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextField
                  label="Ta question"
                  placeholder="Ton dentifrice, tu le presses…"
                  maxLength={QUESTION_LABEL_MAX_LENGTH}
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  error={errors.label?.message}
                />
              )}
            />

            <View style={styles.options}>
              <Text style={styles.optionsTitle}>
                Réponses ({QUESTION_MIN_OPTIONS} à {QUESTION_MAX_OPTIONS})
              </Text>

              {fields.map((field, index) => (
                <View key={field.id} style={styles.option}>
                  <View style={styles.optionLabel}>
                    <Controller
                      control={control}
                      name={`options.${index}.label`}
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextField
                          label={`Réponse ${index + 1}`}
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

                  <View style={styles.optionStatLabel}>
                    <Controller
                      control={control}
                      name={`options.${index}.stat_label`}
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextField
                          label="StatOwrel"
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

                  {/* The floor is two, so the last two options carry no way out
                      — a form that lets itself be emptied only to refuse the
                      result is a form that says no twice. */}
                  {fields.length > QUESTION_MIN_OPTIONS ? (
                    <Button
                      label={`Retirer la réponse ${index + 1}`}
                      variant="ghost"
                      size="icon-sm"
                      icon={Trash2}
                      onPress={() => remove(index)}
                    />
                  ) : null}
                </View>
              ))}

              {fields.length < QUESTION_MAX_OPTIONS ? (
                <Button
                  label="Ajouter une réponse"
                  variant="outline"
                  size="sm"
                  icon={Plus}
                  onPress={() => append(emptyOption())}
                />
              ) : null}
            </View>

            {failure === null ? null : <Text style={styles.error}>{failure}</Text>}

            {/* The price stays on the button here as it is on the card that
                opens this sheet: it is what the action costs, not what it is,
                so it takes the trailing slot rather than the label. */}
            <Button
              label="Poser ma question"
              trailingLabel={amountLabel(QUESTION_STATCOIN_COST)}
              accessibilityLabel={`Poser ma question, ${spokenAmountLabel(QUESTION_STATCOIN_COST)}`}
              loading={isSubmitting}
              onPress={onSubmit}
            />
          </View>
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
  );
};
