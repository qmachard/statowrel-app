import type { UserFriendData } from '@statowrel/models';
import { ChevronRight } from '@/components/icons';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/Card';
import { borderWidth, colors, fontSize, fonts, spacing } from '@/design/tokens';
import { FriendRow } from '@/friends/components/FriendRow';
import { PendingActions } from '@/friends/components/PendingActions';
import { EMPTY, FAILURE, NOTES } from '@/friends/copy';
import { useFriends } from '@/friends/data/useFriends';
import { useFriendshipWrite } from '@/friends/data/useFriendshipWrite';

export interface FriendsCardProps {
  /** Opens a friend's own screen — their streak and the compatibility with them (docs/prd.md §5.3). Accepted friendships only. */
  onOpenFriend: (friendId: string, friendUsername: string) => void;
}

const styles = StyleSheet.create({
  // The card *is* the list: no padding of its own, no gap between the rows —
  // the separators do that work, and they run the full width of the surface.
  list: {
    gap: 0,
    paddingVertical: 0,
    overflow: 'hidden',
  },
  separated: {
    borderTopWidth: borderWidth,
    borderTopColor: colors.border,
  },
  state: {
    paddingHorizontal: spacing(5),
    paddingVertical: spacing(5),
  },
  empty: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    color: colors['muted-foreground'],
  },
  error: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    color: colors.destructive,
  },
});

/** A friendship as the list renders it — the entry plus what it currently is. */
interface Line {
  friendship: UserFriendData;
  kind: 'incoming' | 'accepted' | 'outgoing';
}

/**
 * « Mes amis » on the Menu screen (docs/prd.md §5.3) — the first thing in the
 * app to read `v1_user_friends`, and now to write one back.
 *
 * The card *is* the list and carries no heading of its own: it is one of the two
 * panels of the Menu screen's tab switch, and the tab it hangs off already names
 * it. The invitation button rides on that same tab row, where the title used to
 * carry it. One surface cut into rows by separators, rather than a card per
 * friend. Invitations are lines of that same list — both halves of a friendship
 * exist from the moment it is sent, so an invitation received is already here,
 * and hiding it until it resolves would lose it. The ones waiting on this user
 * come first, since they are the only lines with something to do.
 *
 * A pending invitation carries its two answers as buttons under the row's note
 * — « Accepter » / « Refuser » on one received, « Annuler » on one sent — the
 * answer sitting under what it answers.
 *
 * An accepted row carries a chevron instead, and the whole row takes the tap:
 * it opens that friend's own screen (docs/prd.md §5.3). « Retirer ce pote »
 * moved there, into the screen's own menu — a row that leads somewhere should
 * not also hold a menu, and removing somebody belongs on the page about them
 * rather than half an inch from the line that opens it.
 */
export const FriendsCard = ({ onOpenFriend }: FriendsCardProps) => {
  const { accepted, incoming, outgoing, loading } = useFriends();
  const { busy, running, failed, run } = useFriendshipWrite();

  const lines: Line[] = [
    ...incoming.map((friendship): Line => ({ friendship, kind: 'incoming' })),
    ...accepted.map((friendship): Line => ({ friendship, kind: 'accepted' })),
    ...outgoing.map((friendship): Line => ({ friendship, kind: 'outgoing' })),
  ];

  return (
    <Card style={styles.list}>
      {loading ? (
        <View style={styles.state}>
          <ActivityIndicator color={colors.foreground} />
        </View>
      ) : null}

      {!loading && lines.length === 0 ? (
        <View style={styles.state}>
          <Text style={styles.empty}>{EMPTY}</Text>
        </View>
      ) : null}

      {lines.map((line, index) => (
        <View key={line.friendship.friend_id} style={index === 0 ? null : styles.separated}>
          <FriendRow
            username={line.friendship.friend_username}
            note={line.kind === 'accepted' ? undefined : NOTES[line.kind]}
            // Only an accepted friendship opens onto something: there is
            // nothing to show about somebody who has not accepted yet, and a
            // row already asking « Accepter » / « Refuser » would be a third
            // target on top of the two it is waiting on.
            onPress={line.kind === 'accepted'
              ? () => onOpenFriend(line.friendship.friend_id, line.friendship.friend_username)
              : undefined}
            action={line.kind === 'accepted' ? undefined : (
              <PendingActions
                friendship={line.friendship}
                incoming={line.kind === 'incoming'}
                busy={busy === line.friendship.friend_id}
                running={running}
                run={run}
              />
            )}
          >
            {/* A chevron, not a menu. The row itself opens the friend's
                screen now, and « Retirer ce pote » went with it — a menu
                beside a row that is already pressable offers two targets for
                a line that does one thing. The chevron is the affordance
                instead: it says the row leads somewhere. */}
            {line.kind === 'accepted' ? (
              <ChevronRight size={20} color={colors['muted-foreground']} />
            ) : null}
          </FriendRow>
        </View>
      ))}

      {failed ? (
        <View style={[ styles.state, lines.length === 0 ? null : styles.separated ]}>
          <Text style={styles.error}>{FAILURE}</Text>
        </View>
      ) : null}
    </Card>
  );
};
