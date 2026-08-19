import { useNavigation } from '@react-navigation/native';
import { CalendarCheck, Trophy } from 'lucide-react-native';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/AuthContext';
import { colors, spacing } from '@/design/tokens';
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
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    gap: spacing(6),
    padding: spacing(5),
    paddingBottom: spacing(12),
  },
  tiles: {
    flexDirection: 'row',
    gap: spacing(5),
  },
});

export const StatsScreen = () => {
  const navigation = useNavigation();
  const { profile } = useAuth();
  const { user, answers, fixtures, fixtureId, selectFixture } = useStatsData();

  // The signed-in username is the one piece of real data available today; the
  // stats below it still come from the fixture. The greeting drops the `@` —
  // it reads as a name there, and the handle is shown as one on the profile.
  const displayName = profile?.username ?? user.username;

  return (
    <SafeAreaView style={styles.safeArea} edges={[ 'top' ]}>
      <ScrollView contentContainerStyle={styles.content}>
        <StatsHeader displayName={displayName} onEditProfile={() => navigation.navigate('Profile')} />

        <StreakCard count={user.streak_count} />

        <View style={styles.tiles}>
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
