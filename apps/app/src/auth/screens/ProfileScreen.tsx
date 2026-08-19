import { LogOut } from 'lucide-react-native';
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

export const ProfileScreen = () => {
  const { user, profile } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={[ 'top' ]}>
      <ScrollView contentContainerClassName="grow justify-center gap-8 p-6">
        <View className="gap-2 rounded-panel border-2 border-border bg-card px-6 py-5 shadow-md">
          <Text className="font-head text-2xl uppercase text-card-foreground">
            {profile?.display_name ?? 'Profil en cours de création…'}
          </Text>
          <Text className="font-sans text-sm text-foreground/60">{profile?.email ?? user.email ?? '—'}</Text>
          <Text className="font-sans text-sm text-foreground/60">
            Connecté via {profile?.auth_providers.map((provider) => PROVIDER_LABELS[provider] ?? provider).join(', ') || '—'}
          </Text>
          <Text className="font-sans text-xs text-foreground/60">UID {user.uid}</Text>
        </View>

        <Button label="Se déconnecter" variant="secondary" icon={LogOut} onPress={() => signOut()} />
      </ScrollView>
    </SafeAreaView>
  );
};
