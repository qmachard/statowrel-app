import { useNavigation } from '@react-navigation/native';
import { ChevronLeft } from 'lucide-react-native';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/AuthContext';
import { signOut } from '@/auth/providers';
import { Button } from '@/components/Button';
import { shadows } from '@/design/shadows';

const PROVIDER_LABELS: Record<string, string> = {
  'password': 'E-mail',
  'google.com': 'Google',
  'apple.com': 'Apple',
  'facebook.com': 'Facebook',
};

export const ProfileScreen = () => {
  const navigation = useNavigation();
  const { user, profile } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={[ 'top' ]}>
      <ScrollView contentContainerClassName="grow gap-8 p-6">
        {/* The stack has no header (and no tab bar since docs/prd.md §5.1), so the
            way back to Stats has to live in the screen. */}
        <View className="flex-row items-center gap-3">
          <Button label="Retour" variant="outline" size="icon-sm" icon={ChevronLeft} onPress={() => navigation.goBack()} />
          <Text className="font-head text-xl uppercase text-foreground">Profil</Text>
        </View>

        <View style={shadows.md} className="gap-2 rounded-md border-2 border-border bg-card px-6 py-5">
          <Text className="font-head text-2xl uppercase text-card-foreground">
            {profile?.display_name ?? 'Profil en cours de création…'}
          </Text>
          <Text className="font-sans text-sm text-muted-foreground">{profile?.email ?? user.email ?? '—'}</Text>
          <Text className="font-sans text-sm text-muted-foreground">
            Connecté via {profile?.auth_providers.map((provider) => PROVIDER_LABELS[provider] ?? provider).join(', ') || '—'}
          </Text>
          <Text className="font-sans text-xs text-muted-foreground">UID {user.uid}</Text>
        </View>

        <Button label="Se déconnecter" variant="secondary" onPress={() => signOut()} />
      </ScrollView>
    </SafeAreaView>
  );
};
