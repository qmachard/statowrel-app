import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SocialSignInButtons } from '@/auth/SocialSignInButtons';
import { authErrorMessage } from '@/auth/errors';
import { signInWithEmail } from '@/auth/providers';
import { type SignInValues, signInSchema } from '@/auth/schemas';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';

export default function SignInScreen() {
  const [ error, setError ] = useState<string | null>(null);

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setError(null);

    try {
      await signInWithEmail(email, password);
    } catch (caught) {
      setError(authErrorMessage(caught));
    }
  });

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerClassName="grow justify-center gap-8 p-6" keyboardShouldPersistTaps="handled">
          <View className="gap-2">
            <Text className="font-head text-3xl uppercase text-foreground">Content de te revoir</Text>
            <Text className="font-sans text-base text-muted-foreground">
              Connecte-toi pour retrouver la question du jour.
            </Text>
          </View>

          <View className="gap-4">
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
                  placeholder="••••••••"
                  autoCapitalize="none"
                  autoComplete="current-password"
                  textContentType="password"
                  secureTextEntry
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  error={errors.password?.message}
                />
              )}
            />

            {error ? <Text className="font-sans text-sm text-destructive">{error}</Text> : null}

            <Button label="Se connecter" loading={isSubmitting} onPress={onSubmit} />
          </View>

          <View className="gap-3">
            <Text className="text-center font-sans text-sm uppercase text-muted-foreground">ou</Text>
            <SocialSignInButtons disabled={isSubmitting} />
          </View>

          <Link href="/sign-up" asChild>
            <Text className="text-center font-sans text-base text-foreground underline">
              Pas encore de compte ? Inscris-toi
            </Text>
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
