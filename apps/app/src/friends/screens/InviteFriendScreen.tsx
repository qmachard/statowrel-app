import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation } from '@react-navigation/native';
import type { InviteFriendOutcome, InviteFriendResult } from '@statowrel/models';
import { X } from 'lucide-react-native';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { SuccessCheck } from '@/components/animations';
import { TextField } from '@/components/TextField';
import { colors, fontSize, fonts, spacing } from '@/design/tokens';
import { inviteFriend } from '@/friends/data/inviteFriend';
import { type InviteFailure, inviteFailure } from '@/friends/errors';
import { type InviteFriendValues, inviteFriendSchema } from '@/friends/schemas';
import { useSheetBottomInset } from '@/lib/useSheetBottomInset';

/** What the handle is asked for, said once above the field (docs/prd.md §4.1). */
const HELP = 'Tape son nom d’utilisateur exact : il n’y a ni recherche, ni annuaire.';

/**
 * What each outcome has to say, once the invitation has been through. Only
 * `invited` is an event — the other two are the pair already existing, and they
 * are stated rather than celebrated.
 */
const OUTCOME_MESSAGES: Record<InviteFriendOutcome, (username: string) => string> = {
  invited: (username) => `Invitation envoyée à @${username}.`,
  already_invited: (username) => `Une invitation est déjà en attente avec @${username}.`,
  already_friends: (username) => `Tu es déjà pote avec @${username}.`,
};

const styles = StyleSheet.create({
  // No `flex: 1` on the way down: the sheet's detent is `fitToContents`, so a
  // stretched child would make it measure the whole screen instead — same
  // constraint as the daily question sheet.
  content: {
    gap: spacing(5),
    padding: spacing(6),
    paddingTop: spacing(4),
  },
  // The way out sits on its own line, pushed right, so the title below runs the
  // full width of the sheet.
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
});

/**
 * Inviting a friend by handle — the « Inviter un pote » button of docs/prd.md
 * §5.1, and the only one of the section's three ways in that exists (the
 * invitation link and the six-character code are still to come).
 *
 * A dismissable `formSheet` route sized by its own content, like the daily
 * question and unlike the onboarding sheet: nothing is blocked on inviting
 * somebody, so it is navigation that opens it and a tap outside that closes it.
 *
 * The handle is resolved by the `friends-inviteFriend` callable, which writes
 * both halves of the friendship — the app writes nothing itself. Everything
 * that fails does so under the field, because the only thing the user can
 * change here is what they typed: an unknown handle is « Utilisateur
 * introuvable. » and nothing else (`src/friends/errors.ts`).
 *
 * Once it has been through, the form is replaced by what happened rather than
 * left standing with a message under it — the sheet had one thing to do.
 */
export const InviteFriendScreen = () => {
  const navigation = useNavigation();
  const bottomInset = useSheetBottomInset();
  const [ failure, setFailure ] = useState<InviteFailure | null>(null);
  const [ result, setResult ] = useState<InviteFriendResult | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<InviteFriendValues>({
    resolver: zodResolver(inviteFriendSchema),
    defaultValues: { username: '' },
  });

  const onSubmit = handleSubmit(async ({ username }) => {
    setFailure(null);

    try {
      setResult(await inviteFriend(username));
    } catch (caught) {
      setFailure(inviteFailure(caught));
    }
  });

  const fieldError = failure?.scope === 'field' ? failure.message : errors.username?.message;
  const formError = failure?.scope === 'form' ? failure.message : null;

  return (
    <View style={[ styles.content, { paddingBottom: spacing(6) + bottomInset } ]}>
      <View style={styles.close}>
        <Button label="Fermer" variant="outline" size="icon-sm" icon={X} onPress={() => navigation.goBack()} />
      </View>

      {result === null ? (
        <>
          <View style={styles.header}>
            <Text style={styles.title}>Invite un pote</Text>
            <Text style={styles.help}>{HELP}</Text>
          </View>

          <View style={styles.form}>
            <Controller
              control={control}
              name="username"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextField
                  label="Nom d’utilisateur"
                  prefix="@"
                  placeholder="lou.martin"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="off"
                  returnKeyType="send"
                  value={value}
                  onBlur={onBlur}
                  // Lowercased as it is typed, not only on submit: a handle
                  // exists in one single form, and the field has to show the
                  // one that will actually be looked up.
                  onChangeText={(next) => {
                    setFailure(null);
                    onChange(next.toLowerCase());
                  }}
                  onSubmitEditing={onSubmit}
                  error={fieldError}
                />
              )}
            />

            {formError === null ? null : <Text style={styles.error}>{formError}</Text>}

            <Button label="Envoyer l’invitation" loading={isSubmitting} onPress={onSubmit} />
          </View>
        </>
      ) : (
        <View style={styles.outcome}>
          {result.outcome === 'invited' ? <SuccessCheck size="2xl" /> : null}

          <Text style={styles.outcomeMessage}>{OUTCOME_MESSAGES[result.outcome](result.username)}</Text>

          <Button label="Fermer" onPress={() => navigation.goBack()} />
        </View>
      )}
    </View>
  );
};
