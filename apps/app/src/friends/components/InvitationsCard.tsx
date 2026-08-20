import { Check, X } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { DropdownMenu } from '@/components/DropdownMenu';
import { borderWidth, colors, fontSize, fonts, spacing } from '@/design/tokens';
import { FriendRow } from '@/friends/components/FriendRow';
import { FAILURE, NOTES, REMOVE_LABELS } from '@/friends/copy';
import { acceptFriendship, removeFriendship } from '@/friends/data/friendships';
import { useFriendAvatars } from '@/friends/data/useFriendAvatars';
import { useFriends } from '@/friends/data/useFriends';
import { useFriendshipWrite } from '@/friends/data/useFriendshipWrite';

const styles = StyleSheet.create({
  root: {
    gap: spacing(3),
  },
  title: {
    fontFamily: fonts.head,
    fontSize: fontSize.xl,
    textTransform: 'uppercase',
    color: colors.foreground,
  },
  list: {
    gap: 0,
    paddingVertical: 0,
    overflow: 'hidden',
  },
  separated: {
    borderTopWidth: borderWidth,
    borderTopColor: colors.border,
  },
  error: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    color: colors.destructive,
    paddingHorizontal: spacing(5),
    paddingVertical: spacing(5),
  },
});

/**
 * The invitations received, at the top of the Stats screen.
 *
 * The friend list on the Menu screen keeps them too (`FriendsCard`), but an
 * invitation is the one thing in the app waiting on an answer, and the Menu is
 * a screen the user has no reason to open. Here it is unmissable — and it
 * renders nothing at all once there is nothing to answer, so the home screen
 * only carries it when it has something to say.
 */
export const InvitationsCard = () => {
  const { incoming } = useFriends();
  const { busy, failed, run } = useFriendshipWrite();
  const avatars = useFriendAvatars(incoming.map((friendship) => friendship.friend_id));

  if (incoming.length === 0) {
    return null;
  }

  return (
    <View style={styles.root}>
      <Text style={styles.title}>
        {incoming.length === 1 ? 'Invitation' : 'Invitations'}
      </Text>

      <Card style={styles.list}>
        {incoming.map((friendship, index) => (
          <View key={friendship.friend_id} style={index === 0 ? null : styles.separated}>
            <FriendRow
              username={friendship.friend_username}
              photoUrl={avatars[friendship.friend_id]}
              note={NOTES.incoming}
              action={(
                <Button
                  label="Accepter"
                  icon={Check}
                  size="sm"
                  loading={busy === friendship.friend_id}
                  onPress={() => run(friendship.friend_id, acceptFriendship)}
                />
              )}
            >
              <DropdownMenu
                label={`Gérer @${friendship.friend_username}`}
                disabled={busy === friendship.friend_id}
                items={[
                  {
                    label: REMOVE_LABELS.incoming,
                    icon: X,
                    variant: 'destructive',
                    onPress: () => run(friendship.friend_id, removeFriendship),
                  },
                ]}
              />
            </FriendRow>
          </View>
        ))}

        {failed ? <Text style={[ styles.error, styles.separated ]}>{FAILURE}</Text> : null}
      </Card>
    </View>
  );
};
