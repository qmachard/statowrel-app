import type { UserFriendData } from '@statowrel/models';
import { Check, UserRoundPlus, X } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { DropdownMenu } from '@/components/DropdownMenu';
import { borderWidth, colors, fontSize, fonts, spacing } from '@/design/tokens';
import { FriendRow } from '@/friends/components/FriendRow';
import { acceptFriendship, removeFriendship } from '@/friends/data/friendships';
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

/**
 * Refusing, cancelling and removing are the same delete (see
 * `data/friendships.ts`) — only what the user is doing differs, so only the
 * wording does.
 */
const REMOVE_LABELS = {
  accepted: 'Retirer ce pote',
  incoming: 'Refuser l’invitation',
  outgoing: 'Annuler l’invitation',
};

/** docs/prd.md §5.3 — the empty state takes the place of the list, verbatim. */
const EMPTY = 'Sans potes, StatOwrel c’est juste des chiffres.';

const FAILURE = 'Ça n’a pas marché. Vérifie ta connexion et réessaie.';

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

/** A friendship as the list renders it — the entry plus what can be done to it. */
interface Line {
  friendship: UserFriendData;
  note?: string;
  removeLabel: string;
  acceptable: boolean;
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
 * Accepting is one button on the row; refusing, cancelling and removing sit in
 * the row's menu, because they are the same delete and none of them is the
 * obvious tap.
 */
export const FriendsCard = ({ onInvite }: FriendsCardProps) => {
  const { user } = useAuth();
  const { accepted, incoming, outgoing, loading } = useFriends();
  const [ busy, setBusy ] = useState<string | null>(null);
  const [ failed, setFailed ] = useState(false);

  const lines: Line[] = [
    ...incoming.map((friendship) => ({
      friendship,
      note: NOTES.incoming,
      removeLabel: REMOVE_LABELS.incoming,
      acceptable: true,
    })),
    ...accepted.map((friendship) => ({
      friendship,
      removeLabel: REMOVE_LABELS.accepted,
      acceptable: false,
    })),
    ...outgoing.map((friendship) => ({
      friendship,
      note: NOTES.outgoing,
      removeLabel: REMOVE_LABELS.outgoing,
      acceptable: false,
    })),
  ];

  const avatars = useFriendAvatars(lines.map((line) => line.friendship.friend_id));

  // The list is a subscription, so nothing is applied optimistically here: the
  // row is held busy until the write lands and the snapshot says what happened.
  const run = async (friendId: string, write: (userId: string, friend: string) => Promise<void>) => {
    if (user === null) {
      return;
    }

    setBusy(friendId);
    setFailed(false);

    try {
      await write(user.uid, friendId);
    } catch (error: unknown) {
      console.warn('[friends] could not write the friendship', friendId, error);
      setFailed(true);
    } finally {
      setBusy(null);
    }
  };

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
              note={line.note}
            >
              {line.acceptable ? (
                <Button
                  label="Accepter"
                  icon={Check}
                  size="sm"
                  loading={busy === line.friendship.friend_id}
                  onPress={() => run(line.friendship.friend_id, acceptFriendship)}
                />
              ) : null}

              <DropdownMenu
                label={`Gérer @${line.friendship.friend_username}`}
                disabled={busy === line.friendship.friend_id}
                items={[
                  {
                    label: line.removeLabel,
                    icon: X,
                    variant: 'destructive',
                    onPress: () => run(line.friendship.friend_id, removeFriendship),
                  },
                ]}
              />
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
