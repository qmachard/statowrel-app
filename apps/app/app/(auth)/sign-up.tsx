import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SocialSignInButtons } from '@/auth/SocialSignInButtons';
import { authErrorMessage } from '@/auth/errors';
import { signUpWithEmail } from '@/auth/providers';
import { type SignUpValues, signUpSchema } from '@/auth/schemas';
import { Button } from '@/components/Button';
import { InlineError } from '@/components/InlineError';
import { TextField } from '@/components/TextField';

export default function SignUpScreen() {
  const [ error, setError ] = useState<string | null>(null);

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { display_name: '', email: '', password: '' },
  });

  const onSubmit = handleSubmit(async ({ display_name, email, password }) => {
    setError(null);

    try {
      await signUpWithEmail(email, password, display_name);
    } catch (caught) {
      setError(authErrorMessage(caught));
    }
  });

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerClassName="grow justify-center gap-8 p-6" keyboardShouldPersistTaps="handled">
          <View className="gap-2">
            <Text className="font-head text-3xl uppercase text-black">Rejoins la partie</Text>
            <Text className="font-sans text-base text-black/60">
              Une question par jour, les réponses de tes potes en prime.
            </Text>
          </View>

          <View className="gap-4">
            <Controller
              control={control}
              name="display_name"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextField
                  label="Pseudo"
                  placeholder="ton pseudo"
                  autoCapitalize="none"
                  autoComplete="username"
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  error={errors.display_name?.message}
                />
              )}
            />

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

            {error ? <InlineError message={error} /> : null}

            <Button label="Créer mon compte" loading={isSubmitting} onPress={onSubmit} />
          </View>

          <View className="gap-3">
            <Text className="text-center font-sans text-sm uppercase text-black/60">ou</Text>
            <SocialSignInButtons disabled={isSubmitting} />
          </View>

          <Link href="/sign-in" asChild>
            <Text className="text-center font-sans text-base text-black underline">
              Déjà un compte ? Connecte-toi
            </Text>
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
