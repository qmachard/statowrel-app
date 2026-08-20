import { UserRoundPlus } from 'lucide-react-native';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { colors, fontSize, fonts, spacing } from '@/design/tokens';
import { FriendRow } from '@/friends/components/FriendRow';
import { useFriendAvatars } from '@/friends/data/useFriendAvatars';
import { useFriends } from '@/friends/data/useFriends';

export interface FriendsCardProps {
  /** Opens the `InviteFriend` sheet — docs/prd.md §4.1. */
  onInvite: () => void;
}

/** What each side of a still-pending invitation is waiting on. */
const NOTES = {
  incoming: 'T’a envoyé une invitation.',
  outgoing: 'Invitation envoyée, en attente.',
};

/** docs/prd.md §5.3 — the empty state takes the place of the list, verbatim. */
const EMPTY = 'Sans potes, StatOwrel c’est juste des chiffres.';

const styles = StyleSheet.create({
  content: {
    gap: spacing(4),
  },
  list: {
    gap: spacing(3),
  },
  sectionLabel: {
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    textTransform: 'uppercase',
    color: colors['muted-foreground'],
  },
  empty: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    color: colors['muted-foreground'],
  },
  loader: {
    alignItems: 'flex-start',
  },
});

/**
 * « Mes amis » on the Profile screen (docs/prd.md §5.3) — the first thing in
 * the app to read `v1_user_friends`.
 *
 * The invitation button leads the card rather than closing it: an empty list is
 * exactly when it has something to do, and §5.3 puts it at the head of the list
 * for that reason.
 *
 * Pending invitations are shown beside the accepted friendships instead of
 * being hidden until they resolve — both halves of a friendship exist from the
 * invitation onwards, so an invitation received is already in this list, and a
 * list that dropped it would leave the user wondering where their pote went.
 * Answering one — accepting, refusing, removing — is not wired yet: the rules
 * allow it (`firestore.rules`), nothing calls it.
 */
export const FriendsCard = ({ onInvite }: FriendsCardProps) => {
  const { accepted, incoming, outgoing, loading } = useFriends();
  const isEmpty = accepted.length === 0 && incoming.length === 0 && outgoing.length === 0;
  // Everybody on screen at once: the three sections are one list of friends,
  // split by state, and their pictures come from the same batch of reads.
  const avatars = useFriendAvatars(
    [ ...accepted, ...incoming, ...outgoing ].map((friendship) => friendship.friend_id),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mes potes</CardTitle>
      </CardHeader>

      <CardContent style={styles.content}>
        <Button label="Inviter un pote" icon={UserRoundPlus} onPress={onInvite} />

        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator color={colors.foreground} />
          </View>
        ) : null}

        {!loading && isEmpty ? <Text style={styles.empty}>{EMPTY}</Text> : null}

        {accepted.length === 0 ? null : (
          <View style={styles.list}>
            {accepted.map((friendship) => (
              <FriendRow
                key={friendship.friend_id}
                username={friendship.friend_username}
                photoUrl={avatars[friendship.friend_id]}
              />
            ))}
          </View>
        )}

        {incoming.length === 0 ? null : (
          <View style={styles.list}>
            <Text style={styles.sectionLabel}>Invitations reçues</Text>
            {incoming.map((friendship) => (
              <FriendRow
                key={friendship.friend_id}
                username={friendship.friend_username}
                photoUrl={avatars[friendship.friend_id]}
                note={NOTES.incoming}
              />
            ))}
          </View>
        )}

        {outgoing.length === 0 ? null : (
          <View style={styles.list}>
            <Text style={styles.sectionLabel}>Invitations envoyées</Text>
            {outgoing.map((friendship) => (
              <FriendRow
                key={friendship.friend_id}
                username={friendship.friend_username}
                photoUrl={avatars[friendship.friend_id]}
                note={NOTES.outgoing}
              />
            ))}
          </View>
        )}
      </CardContent>
    </Card>
  );
};
