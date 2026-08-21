import { useNavigation } from '@react-navigation/native';
import { CalendarCheck, Trophy } from 'lucide-react-native';
import { RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, pagePadding, spacing } from '@/design/tokens';
import { InvitationsCard } from '@/friends/components/InvitationsCard';
import { DailyQuestionBanner } from '@/stats/components/DailyQuestionBanner';
import { StatTile } from '@/stats/components/StatTile';
import { StatsCalendar } from '@/stats/components/StatsCalendar';
import { StatsHeader } from '@/stats/components/StatsHeader';
import { StatsStrip } from '@/stats/components/StatsStrip';
import { StreakCard } from '@/stats/components/StreakCard';
import { useStatsData } from '@/stats/data/useStatsData';
import { resolveStreakCount } from '@/stats/helpers/streak';

/**
 * The root of the app (docs/prd.md §5.1, §5.2), from top to bottom: the
 * invitations waiting on an answer, the day's banner — the question while it is
 * still open, « RDV demain » once it has been answered — the streak and its
 * counters on a scrolling strip, then the calendar. The daily question sheet
 * lands on top of it (§5.4).
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
  const {
    profile,
    today,
    month,
    selectMonth,
    calendar,
    todayQuestion,
    answeredToday,
    archiveStart,
    refreshing,
    refresh,
  } = useStatsData();

  // The profile is null while it loads, and stays null until the onboarding
  // sheet has created it. Zeros rather than nothing invented, nothing crashing.
  const streakCount = profile === null ? 0 : resolveStreakCount(profile, today);

  // The banner is the day's status line, whichever side of the answer one is
  // on: the question while it waits, « RDV demain » once it has been given. It
  // only steps aside on a day no question ever dropped on.
  const bannerLabel = answeredToday ? null : todayQuestion?.label ?? null;
  const showBanner = answeredToday || todayQuestion !== null;

  return (
    <SafeAreaView style={styles.safeArea} edges={[ 'top' ]}>
      <ScrollView
        contentContainerStyle={styles.content}
        // The calendar is fetched, not subscribed to (see `useStatsData`), so
        // the screen owes the user a way of asking for it again — the gesture
        // everybody already tries on a screen that looks stale.
        refreshControl={(
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { void refresh(); }}
            tintColor={colors.foreground}
            colors={[ colors.foreground ]}
            progressBackgroundColor={colors.card}
          />
        )}
      >
        <StatsHeader
          displayName={profile?.username ?? ''}
          onInvite={() => navigation.navigate('InviteFriend')}
          onOpenMenu={() => navigation.navigate('Menu')}
        />

        <InvitationsCard />

        {showBanner ? (
          <DailyQuestionBanner
            label={bannerLabel}
            onPress={() => navigation.navigate('DailyQuestion')}
          />
        ) : null}

        <StatsStrip>
          <StreakCard count={streakCount} />
          <StatTile icon={Trophy} label="Record" value={profile?.streak_best ?? 0} unit="jours d’affilée" />
          <StatTile
            icon={CalendarCheck}
            label="Total"
            value={profile?.answers_count ?? 0}
            unit="jours"
          />
        </StatsStrip>

        <StatsCalendar
          month={month}
          onMonthChange={selectMonth}
          calendar={calendar}
          archiveStart={archiveStart}
        />
      </ScrollView>
    </SafeAreaView>
  );
};
