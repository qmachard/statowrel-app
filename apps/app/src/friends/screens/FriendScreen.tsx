import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { CalendarCheck, ChevronLeft, Trophy } from '@/components/icons';
import { colors, fontSize, fonts, pagePadding, spacing } from '@/design/tokens';
import { CompatibilityCard } from '@/friends/components/CompatibilityCard';
import { useFriendProfile } from '@/friends/data/useFriendProfile';
import { StatTile } from '@/stats/components/StatTile';
import { StatsStrip } from '@/stats/components/StatsStrip';
import { StreakCard } from '@/stats/components/StreakCard';
import type { RootStackParamList } from '@/navigation/types';

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    gap: spacing(8),
    padding: pagePadding,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(3),
  },
  heading: {
    fontFamily: fonts.head,
    fontSize: fontSize.xl,
    textTransform: 'uppercase',
    color: colors.foreground,
  },
  // Same block as the Menu screen's own account: the face is the surface, and
  // a friend has to be recognisable in the same shape wherever they appear.
  identity: {
    alignItems: 'center',
    gap: spacing(3),
  },
  name: {
    fontFamily: fonts.head,
    fontSize: fontSize['2xl'],
    textTransform: 'uppercase',
    color: colors.foreground,
  },
  state: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    textAlign: 'center',
    color: colors['muted-foreground'],
  },
});

/** The profile of a friend could not be read — a deleted account, or no connection. */
const PROFILE_FAILURE = 'Impossible de charger ce profil pour l’instant.';

/**
 * One friend, seen from the outside — docs/prd.md §5.3.
 *
 * Two things, in this order: **their** streak, which is the number the friend
 * list has owed since §4.6, and **your** compatibility with them, which is the
 * only number in the app that belongs to two people at once. The stats strip is
 * the Stats screen's own, component for component — a streak reads the same
 * whoever it belongs to, and a second way of drawing one would only be a second
 * thing to keep in step.
 *
 * The handle is taken from the route rather than waited on: it comes off the
 * friendship entry the list already holds, so the screen has a title and a face
 * from its first frame, and the profile read only fills the counters in.
 *
 * Nothing here is subscribed. A friend's counters move once a day at the other
 * end, and the compatibility at most once a day by construction — see
 * `useFriendCompatibility`.
 */
export const FriendScreen = () => {
  const navigation = useNavigation();
  const { params } = useRoute<RouteProp<RootStackParamList, 'Friend'>>();
  const { friendId, friendUsername } = params;

  const { status, profile } = useFriendProfile(friendId);

  return (
    <SafeAreaView style={styles.safeArea} edges={[ 'top' ]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* The stack has no header (docs/prd.md §5.1), so the way back lives in
            the screen — the same row the Menu screen opens on. */}
        <View style={styles.head}>
          <Button label="Retour" variant="outline" size="icon-sm" icon={ChevronLeft} onPress={() => navigation.goBack()} />
          <Text style={styles.heading}>Mon pote</Text>
        </View>

        <View style={styles.identity}>
          <Avatar size="xl" name={friendUsername} />
          <Text style={styles.name} numberOfLines={1}>@{friendUsername}</Text>
        </View>

        {status === 'loading' ? <ActivityIndicator color={colors.foreground} /> : null}

        {status === 'error' ? <Text style={styles.state}>{PROFILE_FAILURE}</Text> : null}

        {profile === null ? null : (
          <StatsStrip>
            <StreakCard count={profile.streak_count} />
            <StatTile icon={Trophy} label="Record" value={profile.streak_best} unit="jours d’affilée" />
            <StatTile icon={CalendarCheck} label="Total" value={profile.answers_count} unit="jours" />
          </StatsStrip>
        )}

        <CompatibilityCard friendId={friendId} />
      </ScrollView>
    </SafeAreaView>
  );
};
