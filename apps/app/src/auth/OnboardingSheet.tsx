import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/auth/AuthContext';
import { UsernameTakenError } from '@/auth/errors';
import { signOut } from '@/auth/providers';
import { type OnboardingValues, onboardingSchema } from '@/auth/schemas';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { colors, fontSize, fonts, spacing } from '@/design/tokens';

const SAVE_FAILED = 'Ton nom d\'utilisateur n\'a pas pu être enregistré. Vérifie ta connexion et réessaie.';
const TAKEN = 'Ce nom d\'utilisateur est déjà pris.';

const styles = StyleSheet.create({
  keyboardAvoider: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    gap: spacing(8),
    padding: spacing(6),
    paddingTop: spacing(8),
  },
  header: {
    gap: spacing(2),
  },
  title: {
    fontFamily: fonts.head,
    fontSize: fontSize['3xl'],
    textTransform: 'uppercase',
    color: colors.foreground,
  },
  subtitle: {
    fontFamily: fonts.sans,
    fontSize: fontSize.base,
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
  signOut: {
    marginTop: 'auto',
    textAlign: 'center',
    fontFamily: fonts.sans,
    fontSize: fontSize.base,
    color: colors.foreground,
    textDecorationLine: 'underline',
  },
});

/**
 * The first thing a brand-new account meets, whatever the provider it came from
 * (docs/prd.md §4.1): the username is typed here and nowhere else — never
 * pre-filled from Google, from Apple, or from the email address.
 *
 * A blocking sheet over the app rather than a screen of its own: the app is
 * right there behind it, and the only way to reach it is through the username.
 * It is the app's one un-dismissable sheet — hence `BottomSheet` rather than
 * the `formSheet` route the daily question uses.
 *
 * It is also what claims the handle and creates `v1_users/{uid}` — until it is
 * through, the session has no username to be known by.
 */
export const OnboardingSheet = () => {
  const { user, needsOnboarding, completeOnboarding } = useAuth();
  const [ error, setError ] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setError: setFieldError,
    formState: { errors, isSubmitting },
  } = useForm<OnboardingValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: { username: '' },
  });

  const onSubmit = handleSubmit(async ({ username }) => {
    setError(null);

    try {
      await completeOnboarding(username);
    } catch (caught) {
      // A taken handle belongs under the field — it is the answer that has to
      // change, not the connection.
      if (caught instanceof UsernameTakenError) {
        setFieldError('username', { message: TAKEN });

        return;
      }

      console.warn('[auth] could not create the user profile', caught);
      setError(SAVE_FAILED);
    }
  });

  return (
    <BottomSheet visible={Boolean(user) && needsOnboarding} label="Choisis ton nom d'utilisateur">
      <KeyboardAvoidingView style={styles.keyboardAvoider} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>Choisis ton nom</Text>
            <Text style={styles.subtitle}>
              Unique, c&apos;est ce que tes potes verront à côté de tes réponses — et ce qu&apos;ils taperont
              pour t&apos;ajouter.
            </Text>
          </View>

          <View style={styles.form}>
            <Controller
              control={control}
              name="username"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextField
                  label="Nom d'utilisateur"
                  placeholder="lou.martin"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="username-new"
                  returnKeyType="done"
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  onSubmitEditing={onSubmit}
                  error={errors.username?.message}
                />
              )}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Button label="C'est parti" loading={isSubmitting} onPress={onSubmit} />
          </View>

          {/* The only way out of the sheet other than through it: the account
              exists, so signing out is what lets a wrong one be swapped. */}
          <Text style={styles.signOut} onPress={() => signOut()}>
            Ce n&apos;est pas le bon compte ? Déconnecte-toi
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </BottomSheet>
  );
};
