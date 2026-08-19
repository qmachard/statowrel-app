import { useNavigation } from '@react-navigation/native';
import { CalendarCheck, Trophy } from 'lucide-react-native';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/AuthContext';
import { colors, spacing } from '@/design/tokens';
import { startOfDay, toDateKey } from '@/lib/dates';
import { DailyQuestionBanner } from '@/stats/components/DailyQuestionBanner';
import { DevFixtureSwitch } from '@/stats/components/DevFixtureSwitch';
import { StatTile } from '@/stats/components/StatTile';
import { StatsCalendar } from '@/stats/components/StatsCalendar';
import { StatsHeader } from '@/stats/components/StatsHeader';
import { StreakCard } from '@/stats/components/StreakCard';
import { useStatsData } from '@/stats/data/useStatsData';

/**
 * The root of the app (docs/prd.md §5.1, §5.2), from top to bottom: the day's
 * question when it is still open, the streak beside its two counters, then the
 * calendar. The daily question sheet lands on top of it (§5.4).
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
  // The streak on the left, as tall as the two counters stacked on the right.
  stats: {
    flexDirection: 'row',
    gap: spacing(4),
  },
  counters: {
    flex: 1,
    gap: spacing(4),
  },
});

export const StatsScreen = () => {
  const navigation = useNavigation();
  const { profile } = useAuth();
  const { user, answers, dailyQuestion, question, fixtures, fixtureId, selectFixture } = useStatsData();

  // The signed-in username is the one piece of real data available today; the
  // stats below it still come from the fixture. The greeting drops the `@` —
  // it reads as a name there, and the handle is shown as one on the profile.
  const displayName = profile?.username ?? user.username;

  const answeredToday = useMemo(() => {
    const todayKey = toDateKey(startOfDay(new Date()));

    return answers.some((answer) => answer.date === todayKey);
  }, [ answers ]);

  // The banner announces a question that is still waiting: once the day is
  // answered it has nothing left to say, and the calendar carries the day.
  const pendingQuestion = dailyQuestion && !answeredToday ? question : null;

  return (
    <SafeAreaView style={styles.safeArea} edges={[ 'top' ]}>
      <ScrollView contentContainerStyle={styles.content}>
        <StatsHeader displayName={displayName} onEditProfile={() => navigation.navigate('Profile')} />

        {pendingQuestion ? (
          <DailyQuestionBanner
            label={pendingQuestion.label}
            onPress={() => navigation.navigate('DailyQuestion')}
          />
        ) : null}

        <View style={styles.stats}>
          <StreakCard count={user.streak_count} />

          <View style={styles.counters}>
            <StatTile icon={Trophy} label="Record" value={user.streak_best} unit="jours d’affilée" />
            <StatTile icon={CalendarCheck} label="Jours répondus" value={answers.length} unit="depuis l’inscription" />
          </View>
        </View>

        <StatsCalendar answers={answers} registeredAt={user.created_at} />

        {__DEV__ ? (
          <DevFixtureSwitch fixtures={fixtures} active={fixtureId} onSelect={selectFixture} />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};
