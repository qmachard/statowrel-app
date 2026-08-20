import type { UserFriendData } from '@statowrel/models';
import { UserRoundPlus, X } from 'lucide-react-native';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { DropdownMenu } from '@/components/DropdownMenu';
import { borderWidth, colors, fontSize, fonts, spacing } from '@/design/tokens';
import { FriendRow } from '@/friends/components/FriendRow';
import { PendingActions } from '@/friends/components/PendingActions';
import { EMPTY, FAILURE, NOTES, REMOVE_LABEL } from '@/friends/copy';
import { removeFriendship } from '@/friends/data/friendships';
import { useFriendAvatars } from '@/friends/data/useFriendAvatars';
import { useFriends } from '@/friends/data/useFriends';
import { useFriendshipWrite } from '@/friends/data/useFriendshipWrite';

export interface FriendsCardProps {
  /** Opens the `InviteFriend` sheet — docs/prd.md §4.1. */
  onInvite: () => void;
}

const styles = StyleSheet.create({
  root: {
    gap: spacing(3),
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing(4),
  },
  title: {
    fontFamily: fonts.head,
    fontSize: fontSize.xl,
    textTransform: 'uppercase',
    color: colors.foreground,
  },
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
 * The title carries the invitation button beside it and the list sits in a card
 * under them: one surface cut into rows by separators, rather than a card per
 * friend. Invitations are lines of that same list — both halves of a friendship
 * exist from the moment it is sent, so an invitation received is already here,
 * and hiding it until it resolves would lose it. The ones waiting on this user
 * come first, since they are the only lines with something to do.
 *
 * A pending invitation carries its two answers as buttons under the row's note
 * — « Accepter » / « Refuser » on one received, « Annuler » on one sent — the
 * answer sitting under what it answers. The row's menu is left to the accepted
 * friendships, where « Retirer ce pote » is the only thing to do and nothing is
 * waiting: a `ghost` trigger, so it does not compete with those buttons.
 */
export const FriendsCard = ({ onInvite }: FriendsCardProps) => {
  const { accepted, incoming, outgoing, loading } = useFriends();
  const { busy, running, failed, run } = useFriendshipWrite();

  const lines: Line[] = [
    ...incoming.map((friendship): Line => ({ friendship, kind: 'incoming' })),
    ...accepted.map((friendship): Line => ({ friendship, kind: 'accepted' })),
    ...outgoing.map((friendship): Line => ({ friendship, kind: 'outgoing' })),
  ];

  const avatars = useFriendAvatars(lines.map((line) => line.friendship.friend_id));

  return (
    <View style={styles.root}>
      <View style={styles.head}>
        <Text style={styles.title}>Mes potes</Text>
        <Button label="Inviter un pote" icon={UserRoundPlus} size="icon-sm" onPress={onInvite} />
      </View>

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
              photoUrl={avatars[line.friendship.friend_id]}
              note={line.kind === 'accepted' ? undefined : NOTES[line.kind]}
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
              {line.kind === 'accepted' ? (
                <DropdownMenu
                  label={`Gérer @${line.friendship.friend_username}`}
                  variant="ghost"
                  disabled={busy === line.friendship.friend_id}
                  items={[
                    {
                      label: REMOVE_LABEL,
                      icon: X,
                      variant: 'destructive',
                      onPress: () => run(line.friendship.friend_id, removeFriendship),
                    },
                  ]}
                />
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
    </View>
  );
};
