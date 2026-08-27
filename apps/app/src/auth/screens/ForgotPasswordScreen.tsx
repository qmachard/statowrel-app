import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { authErrorMessage } from '@/auth/errors';
import { sendPasswordReset } from '@/auth/providers';
import { type ResetPasswordValues, resetPasswordSchema } from '@/auth/schemas';
import { Button } from '@/components/Button';
import { LegalLinks } from '@/components/LegalLinks';
import { TextField } from '@/components/TextField';
import { SuccessCheck } from '@/components/animations';
import { colors, fontSize, fonts, spacing } from '@/design/tokens';
import type { RootStackParamList } from '@/navigation/types';

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardAvoider: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: spacing(8),
    padding: spacing(6),
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
  sent: {
    alignItems: 'center',
    gap: spacing(4),
  },
  sentMessage: {
    textAlign: 'center',
    fontFamily: fonts.sans,
    fontSize: fontSize.base,
    color: colors.foreground,
  },
  switchScreen: {
    textAlign: 'center',
    fontFamily: fonts.sans,
    fontSize: fontSize.base,
    color: colors.foreground,
    textDecorationLine: 'underline',
  },
  footer: {
    paddingHorizontal: spacing(6),
    paddingBottom: spacing(4),
  },
});

/**
 * The « Mot de passe oublié ? » door of the sign-in screen: an address is
 * typed, Firebase mails the reset link, and the new password is chosen on the
 * page it opens — the app never handles it.
 *
 * Once the mail has gone out the form is replaced by what happened, the way the
 * invitation sheet does it: the screen had one thing to do. The confirmation is
 * deliberately the same whether or not an account holds that address
 * (`sendPasswordReset`).
 */
export const ForgotPasswordScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [ error, setError ] = useState<string | null>(null);
  const [ sentTo, setSentTo ] = useState<string | null>(null);

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit(async ({ email }) => {
    setError(null);

    try {
      await sendPasswordReset(email);
      setSentTo(email);
    } catch (caught) {
      setError(authErrorMessage(caught));
    }
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.keyboardAvoider} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {sentTo === null ? (
            <>
              <View style={styles.header}>
                <Text style={styles.title}>Mot de passe oublié</Text>
                <Text style={styles.subtitle}>
                  Donne ton adresse e-mail : on t’envoie un lien pour en choisir un nouveau.
                </Text>
              </View>

              <View style={styles.form}>
                <Controller
                  control={control}
                  name="email"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextField
                      label="Adresse e-mail"
                      placeholder="toi@exemple.fr"
                      autoCapitalize="none"
                      autoComplete="email"
                      keyboardType="email-address"
                      textContentType="emailAddress"
                      returnKeyType="send"
                      value={value}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      onSubmitEditing={onSubmit}
                      error={errors.email?.message}
                    />
                  )}
                />

                {error ? <Text style={styles.error}>{error}</Text> : null}

                <Button label="Envoyer le lien" loading={isSubmitting} onPress={onSubmit} />
              </View>
            </>
          ) : (
            <View style={styles.sent}>
              <SuccessCheck size="2xl" />

              <Text style={styles.sentMessage}>
                Si un compte utilise {sentTo}, un lien de réinitialisation vient d’y être envoyé. Pense à
                regarder dans tes spams.
              </Text>
            </View>
          )}

          <Text
            style={styles.switchScreen}
            onPress={() => navigation.navigate('SignIn')}
          >
            Retour à la connexion
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>

      <LegalLinks style={styles.footer} />
    </SafeAreaView>
  );
};
