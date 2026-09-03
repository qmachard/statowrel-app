import { useNavigation } from '@react-navigation/native';
import { CalendarCheck, Trophy } from '@/components/icons';
import { RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, pagePadding, spacing } from '@/design/tokens';
import { InvitationsCard } from '@/friends/components/InvitationsCard';
import { DailyQuestionBanner } from '@/stats/components/DailyQuestionBanner';
import { ProposeQuestionCard } from '@/stats/components/ProposeQuestionCard';
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
 * still open, the day's mood once it has been answered — the streak and its
 * counters on a scrolling strip, the calendar, and under it the StatFlouzz wallet
 * and what it buys: proposing a question (§4.7). The daily question sheet lands
 * on top of it (§5.4).
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
    todayAnswer,
    todayJokered,
    archiveStart,
    refreshing,
    refresh,
  } = useStatsData();

  // The profile is null while it loads, and stays null until the onboarding
  // sheet has created it. Zeros rather than nothing invented, nothing crashing.
  const streakCount = profile === null ? 0 : resolveStreakCount(profile, today);

  // The wallet is read straight off the profile, which `AuthContext` subscribes
  // to — so the StatFlouzz a milestone just paid land on the card below on their
  // own, without this screen asking for them.
  const statflouzz = profile?.statcoin_balance ?? 0;

  // The banner is the day's status line, whichever side of the answer one is
  // on: the question while it waits, and the question *plus* the mood it earned
  // once it has been given — « Aujourd’hui tu es REBELLE », which is what one
  // otherwise had to go and find again in the calendar. It only steps aside on
  // a day no question ever dropped on.
  const bannerLabel = todayQuestion?.label ?? null;
  const bannerStatLabel = todayAnswer?.stat_label ?? null;
  const showBanner = bannerLabel !== null || bannerStatLabel !== null || todayJokered;

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
          statflouzz={statflouzz}
          onInvite={() => navigation.navigate('InviteFriend')}
          onOpenMenu={() => navigation.navigate('Menu')}
        />

        <InvitationsCard />

        {showBanner ? (
          <DailyQuestionBanner
            label={bannerLabel}
            statLabel={bannerStatLabel}
            jokered={todayJokered}
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

        {/* Under the calendar, because it is what the calendar buys: the days
            answered pay the StatFlouzz (§4.7), and this is what they are for.
            The balance lives here rather than on the strip above — it belongs
            beside the price it is saved towards, and stating it twice on one
            screen, in two framings, reads as two different things. */}
        <ProposeQuestionCard
          statflouzz={statflouzz}
          onPress={() => navigation.navigate('ProposeQuestion')}
        />
      </ScrollView>
    </SafeAreaView>
  );
};
