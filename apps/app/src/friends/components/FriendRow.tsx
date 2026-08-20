import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { colors, fontSize, fonts, spacing } from '@/design/tokens';

export interface FriendRowProps {
  /** The friend's handle, rendered with its `@` — docs/prd.md §4.1. */
  username: string;
  /** Their picture, read from their profile. Undefined while it loads, null when they have none — both fall back to the generated avatar. */
  photoUrl?: string | null;
  /** What this line is waiting on, when it is waiting on something. */
  note?: string;
  /** The row's actions, pushed to the right — the accept button and the menu. */
  children?: ReactNode;
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(3),
    paddingHorizontal: spacing(5),
    paddingVertical: spacing(3),
  },
  body: {
    flex: 1,
    gap: spacing(0.5),
  },
  username: {
    fontFamily: fonts.head,
    fontSize: fontSize.base,
    color: colors['card-foreground'],
  },
  note: {
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    color: colors['muted-foreground'],
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
  },
});

/**
 * One line of the friend list: avatar, handle, what it is waiting on if it is,
 * and its actions on the right.
 *
 * It carries no surface of its own — the card around the list is the surface,
 * and the rows are cut out of it by separators.
 */
export const FriendRow = ({ username, photoUrl, note, children }: FriendRowProps) => (
  <View style={styles.root}>
    <Avatar size="lg" name={username} uri={photoUrl} />

    <View style={styles.body}>
      <Text style={styles.username} numberOfLines={1}>
        @{username}
      </Text>
      {note === undefined ? null : <Text style={styles.note}>{note}</Text>}
    </View>

    {children === undefined ? null : <View style={styles.actions}>{children}</View>}
  </View>
);
