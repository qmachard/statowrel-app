import { useNavigation } from '@react-navigation/native';
import { CalendarCheck, Trophy } from 'lucide-react-native';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/AuthContext';
import { DevFixtureSwitch } from '@/stats/components/DevFixtureSwitch';
import { StatTile } from '@/stats/components/StatTile';
import { StatsCalendar } from '@/stats/components/StatsCalendar';
import { StatsHeader } from '@/stats/components/StatsHeader';
import { StreakCard } from '@/stats/components/StreakCard';
import { useStatsData } from '@/stats/data/useStatsData';

/**
 * The root of the app (docs/prd.md §5.1, §5.2): the streak, its two counters and
 * the calendar. The daily question sheet lands on top of it (§5.4).
 *
 * The stats are still fixtures — see `useStatsData`.
 */
export const StatsScreen = () => {
  const navigation = useNavigation();
  const { profile } = useAuth();
  const { user, answers, fixtures, fixtureId, selectFixture } = useStatsData();

  // The signed-in pseudo is the one piece of real data available today; the
  // stats below it still come from the fixture.
  const displayName = profile?.display_name ?? user.display_name;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={[ 'top' ]}>
      <ScrollView contentContainerClassName="gap-6 p-5 pb-12">
        <StatsHeader displayName={displayName} onEditProfile={() => navigation.navigate('Profile')} />

        <StreakCard count={user.streak_count} />

        <View className="flex-row gap-5">
          <StatTile icon={Trophy} label="Record" value={user.streak_best} unit="jours d’affilée" />
          <StatTile icon={CalendarCheck} label="Jours répondus" value={answers.length} unit="depuis l’inscription" />
        </View>

        <StatsCalendar answers={answers} registeredAt={user.created_at} />

        {__DEV__ ? (
          <DevFixtureSwitch fixtures={fixtures} active={fixtureId} onSelect={selectFixture} />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};
