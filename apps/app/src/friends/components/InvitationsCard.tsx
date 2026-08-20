import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { Card } from '@/components/Card';
import { colors, fontSize, fonts, pagePadding, spacing } from '@/design/tokens';
import { FriendRow } from '@/friends/components/FriendRow';
import { PendingActions } from '@/friends/components/PendingActions';
import { FAILURE, NOTES } from '@/friends/copy';
import { useFriendAvatars } from '@/friends/data/useFriendAvatars';
import { useFriends } from '@/friends/data/useFriends';
import { useFriendshipWrite } from '@/friends/data/useFriendshipWrite';

/**
 * Share of the screen one invitation takes when it is not alone — what is left
 * is the peek of the next one, which is what says the line scrolls. The same
 * device as the stats strip right under it.
 */
const SCREEN_SHARE = 0.85;

const styles = StyleSheet.create({
  strip: {
    // Bleeds back through the screen's padding so the line runs edge to edge:
    // an invitation scrolling out is cut by the screen, not by a gutter.
    marginHorizontal: -pagePadding,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing(4),
    paddingHorizontal: pagePadding,
    // The hard offset shadows fall outside the cards — without this the strip
    // would clip them at the bottom.
    paddingBottom: spacing(2),
  },
  card: {
    paddingVertical: 0,
  },
  error: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    color: colors.destructive,
  },
});

/**
 * The invitations received, at the top of the Stats screen.
 *
 * The friend list on the Menu screen keeps them too (`FriendsCard`), but an
 * invitation is the one thing in the app waiting on an answer, and the Menu is
 * a screen the user has no reason to open. Here it is unmissable — and it
 * renders nothing at all once there is nothing to answer, so the home screen
 * only carries it when it has something to say. No title either: an invitation
 * says what it is, and a heading over one card would only push the day down.
 *
 * One card per invitation on a scrolling line rather than a list, so several
 * of them cost the screen the height of one.
 */
export const InvitationsCard = () => {
  const { incoming } = useFriends();
  const { busy, running, failed, run } = useFriendshipWrite();
  const avatars = useFriendAvatars(incoming.map((friendship) => friendship.friend_id));
  const { width } = useWindowDimensions();

  if (incoming.length === 0) {
    return null;
  }

  const cardWidth = incoming.length === 1 ? width - pagePadding * 2 : width * SCREEN_SHARE;

  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.strip}
        contentContainerStyle={styles.content}
      >
        {incoming.map((friendship) => (
          <Card key={friendship.friend_id} style={[ styles.card, { width: cardWidth } ]}>
            <FriendRow
              username={friendship.friend_username}
              photoUrl={avatars[friendship.friend_id]}
              note={NOTES.incoming}
              action={(
                <PendingActions
                  friendship={friendship}
                  incoming
                  busy={busy === friendship.friend_id}
                  running={running}
                  run={run}
                />
              )}
            />
          </Card>
        ))}
      </ScrollView>

      {failed ? <Text style={styles.error}>{FAILURE}</Text> : null}
    </View>
  );
};
