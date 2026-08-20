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
  /** The line's own answer to its note — rendered under it, in the same column. */
  action?: ReactNode;
  /** The row's actions, pushed to the right — the row's menu. */
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
  action: {
    alignSelf: 'flex-start',
    marginTop: spacing(2),
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
  },
});

/**
 * One line of the friend list: avatar, handle, what it is waiting on if it is,
 * what to do about it under that, and its menu on the right.
 *
 * The action sits under the note rather than beside the handle: it answers the
 * note (« T'a envoyé une invitation. » → « Accepter »), and reading the two in
 * that order is what makes the row make sense.
 *
 * It carries no surface of its own — the card around the list is the surface,
 * and the rows are cut out of it by separators.
 */
export const FriendRow = ({ username, photoUrl, note, action, children }: FriendRowProps) => (
  <View style={styles.root}>
    <Avatar size="lg" name={username} uri={photoUrl} />

    <View style={styles.body}>
      <Text style={styles.username} numberOfLines={1}>
        @{username}
      </Text>
      {note === undefined ? null : <Text style={styles.note}>{note}</Text>}
      {action === undefined ? null : <View style={styles.action}>{action}</View>}
    </View>

    {children === undefined ? null : <View style={styles.actions}>{children}</View>}
  </View>
);
