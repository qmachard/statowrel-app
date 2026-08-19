import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback } from 'react';
import { CalendarCheck, Trophy } from 'lucide-react-native';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/AuthContext';
import { consumeStaleProfile } from '@/daily-question/data/answerStore';
import { colors, pagePadding, spacing } from '@/design/tokens';
import { DailyQuestionBanner } from '@/stats/components/DailyQuestionBanner';
import { StatTile } from '@/stats/components/StatTile';
import { StatsCalendar } from '@/stats/components/StatsCalendar';
import { StatsHeader } from '@/stats/components/StatsHeader';
import { StatsStrip } from '@/stats/components/StatsStrip';
import { StreakCard } from '@/stats/components/StreakCard';
import { useStatsData } from '@/stats/data/useStatsData';
import { resolveStreakCount } from '@/stats/helpers/streak';

/**
 * The root of the app (docs/prd.md §5.1, §5.2), from top to bottom: the day's
 * question when it is still open, the streak and its counters on a scrolling
 * strip, then the calendar. The daily question sheet lands on top of it (§5.4).
 */
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    gap: spacing(6),
    padding: pagePadding,
    paddingBottom: spacing(12),
  },
});

export const StatsScreen = () => {
  const navigation = useNavigation();
  const { refreshProfile } = useAuth();
  const { profile, today, month, selectMonth, calendar, todayQuestion, answeredToday } = useStatsData();

  // The streak and the two counters come off the profile, which the answer
  // trigger moves after the sheet above has written its answer — so coming back
  // from an answer, and only then, costs one read of it.
  useFocusEffect(useCallback(() => {
    if (consumeStaleProfile()) {
      void refreshProfile();
    }
  }, [ refreshProfile ]));

  // The profile is null while it loads, and stays null until the onboarding
  // sheet has created it. Zeros and a calendar bounded to today: nothing
  // invented, nothing crashing.
  const streakCount = profile === null ? 0 : resolveStreakCount(profile, today);
  const registeredAt = profile?.created_at ?? today.toISOString();

  // The banner announces a question that is still waiting: once the day is
  // answered it has nothing left to say, and the calendar carries the day.
  const pendingQuestion = answeredToday ? null : todayQuestion;

  return (
    <SafeAreaView style={styles.safeArea} edges={[ 'top' ]}>
      <ScrollView contentContainerStyle={styles.content}>
        <StatsHeader
          displayName={profile?.username ?? ''}
          onEditProfile={() => navigation.navigate('Profile')}
        />

        {pendingQuestion ? (
          <DailyQuestionBanner
            label={pendingQuestion.label}
            onPress={() => navigation.navigate('DailyQuestion')}
          />
        ) : null}

        <StatsStrip>
          <StreakCard count={streakCount} />
          <StatTile icon={Trophy} label="Record" value={profile?.streak_best ?? 0} unit="jours d’affilée" />
          <StatTile
            icon={CalendarCheck}
            label="Jours répondus"
            value={profile?.answers_count ?? 0}
            unit="depuis l’inscription"
          />
        </StatsStrip>

        <StatsCalendar
          month={month}
          onMonthChange={selectMonth}
          calendar={calendar}
          registeredAt={registeredAt}
        />
      </ScrollView>
    </SafeAreaView>
  );
};
