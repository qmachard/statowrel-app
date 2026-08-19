import { Redirect } from 'expo-router';
import { CalendarCheck, Trophy } from 'lucide-react-native';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/AuthContext';
import { signOut } from '@/auth/providers';
import { DevDataSwitch } from '@/home/DevDataSwitch';
import { HomeHeader } from '@/home/HomeHeader';
import { MonthCalendar } from '@/home/MonthCalendar';
import { StatTile } from '@/home/StatTile';
import { StreakBlock } from '@/home/StreakBlock';
import { useHomeStats } from '@/home/useHomeStats';

/**
 * The Stats screen of docs/prd.md §5.2, and the root of the app: there is no
 * tab bar — Profile and the invitation hang off the two header buttons.
 *
 * The data is still fixtures; `useHomeStats` is the seam where Firestore takes
 * over. Both header buttons are inert until the screens behind them exist.
 */
export default function Index() {
  const { user: session, initializing } = useAuth();
  const { user, answers, signupDate, today, answeredDaysCount, dataset, selectDataset } = useHomeStats();

  if (initializing) {
    return null;
  }

  if (!session) {
    return <Redirect href="/sign-in" />;
  }

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <ScrollView contentContainerClassName="gap-5 p-5 pb-10">
        <HomeHeader
          displayName={user.display_name}
          onInvite={() => {}}
          onEditProfile={() => {}}
        />

        <StreakBlock streakCount={user.streak_count} />

        <View className="flex-row gap-3">
          <StatTile icon={Trophy} tone="pink" label="Record" value={user.streak_best} unit="jours" />
          <StatTile icon={CalendarCheck} label="Répondus" value={answeredDaysCount} unit="jours" />
        </View>

        <MonthCalendar answers={answers} signupDate={signupDate} today={today} />

        <DevDataSwitch dataset={dataset} onSelect={selectDataset} onSignOut={() => signOut()} />
      </ScrollView>
    </SafeAreaView>
  );
}
