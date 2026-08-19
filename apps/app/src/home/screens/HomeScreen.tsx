import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/AuthContext';
import { shadows } from '@/design/shadows';

// Placeholder home screen — it exists to prove the session and the profile
// document are wired end to end. The daily question lands here.
export const HomeScreen = () => {
  const { profile } = useAuth();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={[ 'top' ]}>
      <ScrollView contentContainerClassName="grow justify-center gap-8 p-6">
        <View style={shadows.md} className="rounded-md border-2 border-border bg-primary px-6 py-4">
          <Text className="font-head text-xl uppercase text-primary-foreground">StatOwrel</Text>
        </View>

        <View style={shadows.md} className="gap-2 rounded-md border-2 border-border bg-card px-6 py-5">
          <Text className="font-head text-2xl uppercase text-card-foreground">
            Salut {profile?.display_name ?? 'toi'}
          </Text>
          <Text className="font-sans text-sm text-muted-foreground">
            La question du jour s’affichera ici.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
