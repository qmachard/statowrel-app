import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SocialSignInButtons } from '@/auth/SocialSignInButtons';
import { authErrorMessage } from '@/auth/errors';
import { signUpWithEmail } from '@/auth/providers';
import { type SignUpValues, signUpSchema } from '@/auth/schemas';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
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
  alternatives: {
    gap: spacing(3),
  },
  separator: {
    textAlign: 'center',
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    textTransform: 'uppercase',
    color: colors['muted-foreground'],
  },
  switchScreen: {
    textAlign: 'center',
    fontFamily: fonts.sans,
    fontSize: fontSize.base,
    color: colors.foreground,
    textDecorationLine: 'underline',
  },
});

export const SignUpScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [ error, setError ] = useState<string | null>(null);

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setError(null);

    try {
      await signUpWithEmail(email, password);
    } catch (caught) {
      setError(authErrorMessage(caught));
    }
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.keyboardAvoider} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>Rejoins la partie</Text>
            <Text style={styles.subtitle}>
              Une question par jour, les réponses de tes potes en prime.
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
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  error={errors.email?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextField
                  label="Mot de passe"
                  placeholder="6 caractères minimum"
                  autoCapitalize="none"
                  autoComplete="new-password"
                  textContentType="newPassword"
                  secureTextEntry
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  error={errors.password?.message}
                />
              )}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Button label="Créer mon compte" loading={isSubmitting} onPress={onSubmit} />
          </View>

          <View style={styles.alternatives}>
            <Text style={styles.separator}>ou</Text>
            <SocialSignInButtons disabled={isSubmitting} />
          </View>

          <Text
            style={styles.switchScreen}
            onPress={() => navigation.navigate('SignIn')}
          >
            Déjà un compte ? Connecte-toi
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
