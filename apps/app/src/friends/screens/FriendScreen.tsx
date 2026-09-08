import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { DropdownMenu } from '@/components/DropdownMenu';
import { CalendarCheck, ChevronLeft, Trophy, X } from '@/components/icons';
import { colors, fontSize, fonts, pagePadding, spacing } from '@/design/tokens';
import { CompatibilityCard } from '@/friends/components/CompatibilityCard';
import { useAuth } from '@/auth/AuthContext';
import { FAILURE, REMOVE_LABEL } from '@/friends/copy';
import { removeFriendship } from '@/friends/data/friendships';
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
  // No `flexGrow: 1` here, unlike the Menu screen: nothing on this page is
  // pushed to the bottom, and a scroll content taller than its children is what
  // stretches the stats strip — a horizontal `ScrollView` — down the page.
  content: {
    gap: spacing(8),
    padding: pagePadding,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(3),
  },
  heading: {
    flex: 1,
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
 * **« Retirer ce pote » lives here**, in the header's menu, rather than beside
 * the row that opens this screen: the row leads somewhere, so it holds a
 * chevron and nothing else, and removing somebody belongs on the page about
 * them. The removal drops both halves of the friendship (`data/friendships.ts`)
 * and then leaves — this screen is about a friendship that no longer exists.
 *
 * Nothing here is subscribed. A friend's counters move once a day at the other
 * end, and the compatibility at most once a day by construction — see
 * `useFriendCompatibility`.
 */
export const FriendScreen = () => {
  const navigation = useNavigation();
  const { params } = useRoute<RouteProp<RootStackParamList, 'Friend'>>();
  const { friendId, friendUsername } = params;

  const { user } = useAuth();
  const { status, profile } = useFriendProfile(friendId);
  const [ removing, setRemoving ] = useState(false);

  /**
   * Drops both halves of the friendship, then leaves — this screen is about a
   * friendship that no longer exists.
   *
   * Written here rather than through `useFriendshipWrite`, which the two lists
   * share: that hook exists to say *which row* is being written and swallows
   * the failure into a line the list renders. Here there is one friend and one
   * thing to decide — whether to navigate — and a screen that closes on a
   * failed removal would report a friend as removed who is still there.
   */
  const remove = async () => {
    if (user === null) {
      return;
    }

    setRemoving(true);

    try {
      await removeFriendship(user.uid, friendId);
      navigation.goBack();
    } catch (error: unknown) {
      console.warn('[friends] could not remove the friendship', friendId, error);
      setRemoving(false);
      Alert.alert('Suppression impossible', FAILURE);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={[ 'top' ]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* The stack has no header (docs/prd.md §5.1), so the way back lives in
            the screen — the same row the Menu screen opens on, with this page's
            one action pushed to the far end of it. */}
        <View style={styles.head}>
          <Button label="Retour" variant="outline" size="icon-sm" icon={ChevronLeft} onPress={() => navigation.goBack()} />
          <Text style={styles.heading}>Mon pote</Text>
          <DropdownMenu
            label={`Gérer @${friendUsername}`}
            variant="ghost"
            disabled={removing}
            items={[
              {
                label: REMOVE_LABEL,
                icon: X,
                variant: 'destructive',
                onPress: () => void remove(),
              },
            ]}
          />
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

        <CompatibilityCard friendId={friendId} friendUsername={friendUsername} />
      </ScrollView>
    </SafeAreaView>
  );
};
