import { Redirect } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/AuthContext';
import { authErrorMessage } from '@/auth/errors';
import { resendVerificationEmail, signOut } from '@/auth/providers';
import { Button } from '@/components/Button';

type Pending = 'check' | 'resend' | null;

/**
 * docs/prd.md §4.1 — an email/password account only reaches the app once its
 * address is verified. Social accounts never land here.
 */
export default function VerifyEmailScreen() {
  const { user, initializing, requiresEmailVerification, refreshUser } = useAuth();
  const [ pending, setPending ] = useState<Pending>(null);
  const [ message, setMessage ] = useState<string | null>(null);
  const [ error, setError ] = useState<string | null>(null);

  if (initializing) {
    return null;
  }

  if (!user) {
    return <Redirect href="/sign-in" />;
  }

  if (!requiresEmailVerification) {
    return <Redirect href="/" />;
  }

  const onCheck = async () => {
    setPending('check');
    setError(null);
    setMessage(null);

    try {
      await refreshUser();
      setMessage('Toujours pas vérifiée. Ouvre le lien reçu par e-mail, puis réessaie.');
    } catch (caught) {
      setError(authErrorMessage(caught));
    } finally {
      setPending(null);
    }
  };

  const onResend = async () => {
    setPending('resend');
    setError(null);
    setMessage(null);

    try {
      await resendVerificationEmail();
      setMessage('E-mail renvoyé. Pense à regarder dans tes spams.');
    } catch (caught) {
      setError(authErrorMessage(caught));
    } finally {
      setPending(null);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="grow justify-center gap-8 p-6">
        <View className="gap-2">
          <Text className="font-head text-3xl uppercase text-foreground">Vérifie ton e-mail</Text>
          <Text className="font-sans text-base text-muted-foreground">
            On a envoyé un lien de confirmation à {user.email ?? 'ton adresse'}. Ouvre-le, puis reviens ici.
          </Text>
        </View>

        <View className="gap-3">
          <Button label="J'ai vérifié" loading={pending === 'check'} disabled={pending !== null} onPress={onCheck} />
          <Button
            label="Renvoyer l'e-mail"
            variant="outline"
            loading={pending === 'resend'}
            disabled={pending !== null}
            onPress={onResend}
          />
          <Button label="Se déconnecter" variant="secondary" disabled={pending !== null} onPress={() => signOut()} />
        </View>

        {message ? <Text className="font-sans text-sm text-muted-foreground">{message}</Text> : null}
        {error ? <Text className="font-sans text-sm text-destructive">{error}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}
