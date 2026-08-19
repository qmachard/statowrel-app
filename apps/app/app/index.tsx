import { Link, Redirect } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/AuthContext';
import { signOut } from '@/auth/providers';
import { Button } from '@/components/Button';

const PROVIDER_LABELS: Record<string, string> = {
  'password': 'E-mail',
  'google.com': 'Google',
  'apple.com': 'Apple',
  'facebook.com': 'Facebook',
};

// Placeholder home screen — it exists to prove the session and the profile
// document are wired end to end. Real screens land with the daily question.
export default function Index() {
  const { user, profile, initializing } = useAuth();

  if (initializing) {
    return null;
  }

  if (!user) {
    return <Redirect href="/sign-in" />;
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="grow justify-center gap-8 p-6">
        <View className="border-2 border-border bg-primary px-6 py-4 shadow-md">
          <Text className="font-head text-xl uppercase text-primary-foreground">StatOwrel</Text>
        </View>

        <View className="gap-2 border-2 border-border bg-card px-6 py-5 shadow-md">
          <Text className="font-head text-2xl uppercase text-card-foreground">
            {profile?.display_name ?? 'Profil en cours de création…'}
          </Text>
          <Text className="font-sans text-sm text-muted-foreground">{profile?.email ?? user.email ?? '—'}</Text>
          <Text className="font-sans text-sm text-muted-foreground">
            Connecté via {profile?.auth_providers.map((provider) => PROVIDER_LABELS[provider] ?? provider).join(', ') || '—'}
          </Text>
          <Text className="font-sans text-xs text-muted-foreground">UID {user.uid}</Text>
        </View>

        <Link href="/profile" asChild>
          <Button label="Mon profil" />
        </Link>

        <Button label="Se déconnecter" variant="secondary" onPress={() => signOut()} />
      </ScrollView>
    </SafeAreaView>
  );
}
